'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeft, FileSpreadsheet, LoaderCircle, Plus, RefreshCw, Search, UserRound, UserX, Users, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Employee = {
  id: string; employee_code: string | null; full_name: string; position: string | null;
  department: string | null; section?: string | null; is_active: boolean;
};
type ImportRow = {
  rowNo: number; internal_no: string; employee_code: string; erp_number: string;
  surname: string; given_name: string; full_name: string; department: string;
  section: string; position: string; email: string; phone: string;
  issue?: string; duplicate?: boolean;
};

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0b1010', color: '#f5f5f0',
  border: '1px solid #303939', borderRadius: 9, padding: '11px 12px', outline: 'none',
};
const text = (v: unknown) => String(v ?? '').trim();
const phoneText = (v: unknown) => typeof v === 'number' ? String(Math.trunc(v)) : text(v);

function parseEmployeeSheet(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheet = workbook.Sheets['Sheet2'] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Excel файлд унших хуудас олдсонгүй.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  return matrix.map((cells, index) => {
    const c = Array.isArray(cells) ? cells : [];
    const given = text(c[3]);
    const surname = text(c[4]);
    const code = text(c[1]).toUpperCase();
    const row: ImportRow = {
      rowNo: index + 1, internal_no: text(c[0]), employee_code: code,
      erp_number: text(c[2]), surname, given_name: given,
      full_name: [surname, given].filter(Boolean).join(' '),
      department: text(c[5]), section: text(c[6]), position: text(c[7]),
      email: text(c[8]), phone: phoneText(c[9] || c[10]),
    };
    if (!row.employee_code) row.issue = 'Ажилтны код байхгүй';
    else if (!row.full_name) row.issue = 'Нэр байхгүй';
    return row;
  }).filter((r) => r.employee_code || r.full_name || r.position);
}

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [checked, setChecked] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('employees')
      .select('id, employee_code, full_name, position, department, section, is_active')
      .order('full_name', { ascending: true });
    if (queryError) setError(queryError.message);
    else setRows((data ?? []) as Employee[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadEmployees(); }, [loadEmployees]);

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('employees').insert({
      employee_code: code.trim() || null, full_name: name.trim(),
      position: position.trim() || null, department: department.trim() || null,
    });
    if (insertError) setError(insertError.code === '23505' ? 'Энэ ажилтны код өмнө бүртгэгдсэн байна.' : insertError.message);
    else { setCode(''); setName(''); setPosition(''); setDepartment(''); setNotice('Ажилтан амжилттай бүртгэгдлээ.'); await loadEmployees(); }
    setSaving(false);
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setError(''); setNotice(''); setPreview([]); setChecked(false); setFileName(file.name);
    try {
      const parsed = parseEmployeeSheet(await file.arrayBuffer());
      if (!parsed.length) throw new Error('Excel файлд ажилтны мөр олдсонгүй.');
      setPreview(parsed);
      setNotice(parsed.length + ' мөр уншлаа. Давхардлыг шалгана уу.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Excel файл уншихад алдаа гарлаа.'); }
    event.target.value = '';
  }

  async function checkDuplicates() {
    setChecking(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setChecking(false); return; }
    const codes = [...new Set(preview.filter(r => !r.issue).map(r => r.employee_code))];
    const existing = new Set<string>();
    for (let i = 0; i < codes.length; i += 100) {
      const { data, error: queryError } = await supabase.from('employees').select('employee_code').in('employee_code', codes.slice(i, i + 100));
      if (queryError) { setError('Давхардал шалгаж чадсангүй: ' + queryError.message); setChecking(false); return; }
      (data ?? []).forEach((r: { employee_code: string | null }) => { if (r.employee_code) existing.add(r.employee_code.toUpperCase()); });
    }
    const seen = new Set<string>();
    const next = preview.map(r => {
      if (r.issue) return r;
      const duplicate = existing.has(r.employee_code) || seen.has(r.employee_code);
      seen.add(r.employee_code);
      return { ...r, duplicate, issue: duplicate ? (existing.has(r.employee_code) ? 'Санд өмнө бүртгэгдсэн' : 'Excel дотор давхардсан код') : undefined };
    });
    setPreview(next); setChecked(true);
    const valid = next.filter(r => !r.issue).length;
    setNotice('Шалгалт дууслаа: ' + valid + ' импортлох, ' + (next.length - valid) + ' алгасах мөр.');
    setChecking(false);
  }

  async function importEmployees() {
    const valid = preview.filter(r => !r.issue);
    if (!checked || !valid.length) return;
    setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    let imported = 0;
    for (let i = 0; i < valid.length; i += 25) {
      const batch = valid.slice(i, i + 25).map(r => ({
        internal_no: r.internal_no || null, employee_code: r.employee_code,
        erp_number: r.erp_number || null, surname: r.surname || null,
        given_name: r.given_name || null, full_name: r.full_name,
        department: r.department || null, section: r.section || null,
        position: r.position || null, email: r.email || null, phone: r.phone || null,
      }));
      const { data, error: insertError } = await supabase.from('employees').insert(batch).select('id');
      if (insertError) {
        setError('Импорт ' + imported + ' мөр дээр хүрээд зогслоо: ' + insertError.message + '. SQL migration 0002 ажилласан эсэхийг шалгана уу.');
        setSaving(false); await loadEmployees(); return;
      }
      imported += data?.length ?? batch.length;
    }
    setNotice(imported + ' ажилтныг амжилттай импортоллоо. Давхардсан/алдаатай ' + (preview.length - valid.length) + ' мөрийг алгасав.');
    setPreview([]); setFileName(''); setChecked(false); await loadEmployees(); setSaving(false);
  }

  async function toggleActive(employee: Employee) {
    setError(''); setNotice('');
    const supabase = createClient(); if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); return; }
    const { error: updateError } = await supabase.from('employees').update({ is_active: !employee.is_active }).eq('id', employee.id);
    if (updateError) setError(updateError.message);
    else { setNotice(employee.is_active ? 'Ажилтныг идэвхгүй болголоо.' : 'Ажилтныг идэвхжүүллээ.'); await loadEmployees(); }
  }

  const filtered = useMemo(() => rows.filter(r => [r.employee_code, r.full_name, r.position, r.department, r.section]
    .some(v => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))), [rows, search]);
  const validCount = preview.filter(r => !r.issue).length;

  return (
    <main style={{ minHeight: '100vh', background: '#090b0b', color: '#f5f5f0', padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <div>
            <a href="/" style={{ color: '#f4c62f', textDecoration: 'none', display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 13, marginBottom: 16 }}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
            <div style={{ color: '#f4c62f', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>УДИРДЛАГА / ХҮНИЙ НӨӨЦ</div>
            <h1 style={{ fontSize: 28, margin: '8px 0' }}>Ажилтны бүртгэл</h1>
            <p style={{ color: '#899393', fontSize: 13, margin: 0 }}>Ажилтны мэдээллийг Supabase өгөгдлийн сантай холбож бүртгэнэ.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#f4c62f' }}><Users size={22}/><b>{rows.length} ажилтан</b></div>
        </header>

        {(error || notice) && <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 9, border: '1px solid '+(error ? '#7f3434' : '#376447'), background: error ? '#351b1b' : '#14251b', color: error ? '#ffb5a8' : '#a8e6bd', fontSize: 13 }}>{error || notice}</div>}

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}><FileSpreadsheet color="#f4c62f" size={19}/><h2 style={{ fontSize: 16, margin: 0 }}>Excel-ээс ажилтан импортлох</h2></div>
          <p style={{ color: '#899393', fontSize: 12, marginTop: 0 }}>Sheet2-ийн багануудыг автоматаар уншина. Ажилтны кодоор давхардлыг шалгаж, зөвхөн шинэ ажилтныг нэмнэ.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#202727', border: '1px solid #394343', borderRadius: 9, padding: '10px 14px', cursor: 'pointer', color: '#f4c62f', fontSize: 13, fontWeight: 700 }}><Upload size={16}/> Excel файл сонгох<input type="file" accept=".xlsx,.xls" onChange={chooseFile} style={{ display: 'none' }}/></label>
            {fileName && <span style={{ color: '#c4cfca', fontSize: 12 }}>{fileName}</span>}
            {preview.length > 0 && <button disabled={checking || saving} onClick={() => void checkDuplicates()} style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#e4b92d', color: '#171717', fontWeight: 800, cursor: 'pointer' }}>{checking ? 'Шалгаж байна...' : 'Давхардал шалгах'}</button>}
            {checked && <button disabled={saving || !validCount} onClick={() => void importEmployees()} style={{ border: '1px solid #477a56', borderRadius: 9, padding: '10px 14px', background: '#183323', color: '#a8e6bd', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Импортолж байна...' : validCount + ' ажилтан импортлох'}</button>}
            {preview.length > 0 && <button onClick={() => {setPreview([]);setFileName('');setChecked(false);}} style={{ border: '1px solid #394343', borderRadius: 9, padding: '10px 14px', background: 'transparent', color: '#c4cfca', cursor: 'pointer' }}>Цэвэрлэх</button>}
          </div>
          {preview.length > 0 && <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 10, color: '#c4cfca' }}>
              <span><b style={{color:'#f4c62f'}}>{preview.length}</b> нийт мөр</span><span><b style={{color:'#8cdaa7'}}>{checked ? validCount : preview.length}</b> {checked ? 'импортлох' : 'шалгах шаардлагатай'}</span><span><b style={{color:'#f1a29a'}}>{preview.length - (checked ? validCount : preview.length)}</b> алгасах</span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 340, border: '1px solid #293131', borderRadius: 9 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 950 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1a2222' }}><tr>{['МӨР','АЖИЛТНЫ КОД','ОВОГ НЭР','ХЭЛТЭС','ХЭСЭГ','АЛБАН ТУШААЛ','И-МЭЙЛ','УТАС','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',padding:10,color:'#9ca9a4',fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>{preview.map(r=><tr key={r.rowNo} style={{background:r.issue?'#281b1b':'transparent'}}>{[String(r.rowNo),r.employee_code,r.full_name,r.department,r.section,r.position,r.email,r.phone].map((v,i)=><td key={i} style={{padding:9,borderTop:'1px solid #263030',whiteSpace:'nowrap',maxWidth:230,overflow:'hidden',textOverflow:'ellipsis'}}>{v || '—'}</td>)}<td style={{padding:9,borderTop:'1px solid #263030',color:r.issue?'#f1a29a':'#8cdaa7'}}>{r.issue || (checked?'Бэлэн':'Хүлээгдэж буй')}</td></tr>)}</tbody>
              </table>
            </div>
          </div>}
          <p style={{ color: '#7d8986', fontSize: 11, margin: '12px 0 0' }}>Импорт нь ажилтны код, ERP дугаар, овог/нэр, хэлтэс, хэсэг, албан тушаал, имэйл, утасны мэдээллийг хадгална. Excel файл өөрөө GitHub-д байршихгүй.</p>
        </section>

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Шинэ ажилтан гараар бүртгэх</h2>
          <form onSubmit={addEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Ажилтны код<input style={inputStyle} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ж: ETS0084"/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Овог нэр<input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="Овог нэр" required/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Албан тушаал<input style={inputStyle} value={position} onChange={e=>setPosition(e.target.value)} placeholder="Албан тушаал"/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Хэлтэс<input style={inputStyle} value={department} onChange={e=>setDepartment(e.target.value)} placeholder="Хэлтэс"/></label>
            <button disabled={saving} type="submit" style={{ height: 42, border: 0, borderRadius: 9, background: '#f4c62f', color: '#171717', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: saving ? 'wait' : 'pointer' }}>{saving ? <LoaderCircle size={16}/> : <Plus size={16}/>} Бүртгэх</button>
          </form>
        </section>

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Ажилтны жагсаалт</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1010', border: '1px solid #303939', borderRadius: 9, padding: '0 10px' }}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Код, нэр, албан тушаал..." style={{ ...inputStyle, border: 0, width: 220, padding: '10px 0' }}/></div>
              <button onClick={()=>void loadEmployees()} style={{ border: '1px solid #303939', borderRadius: 9, padding: '9px 11px', background: '#171e1e', color: '#dce3df', cursor: 'pointer' }}><RefreshCw size={16}/></button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
            <thead><tr>{['КОД','ОВОГ НЭР','АЛБАН ТУШААЛ','ХЭЛТЭС','ХЭСЭГ','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, letterSpacing: 1, padding: 12, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><LoaderCircle size={18}/> Уншиж байна...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><UserRound size={20}/><div style={{ marginTop: 8 }}>{rows.length ? 'Хайлтад тохирох ажилтан олдсонгүй.' : 'Одоогоор ажилтан бүртгээгүй байна.'}</div></td></tr> :
              filtered.map(e=><tr key={e.id}>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#f4c62f' }}>{e.employee_code || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', fontWeight: 700 }}>{e.full_name}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.position || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.department || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.section || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><span style={{ color: e.is_active ? '#8cdaa7' : '#f1a29a' }}>{e.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}</span></td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><button onClick={()=>void toggleActive(e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #303939', borderRadius: 7, color: '#cbd4d0', padding: '7px 9px', cursor: 'pointer' }}>{e.is_active ? <UserX size={14}/> : <UserRound size={14}/>} {e.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</button></td>
              </tr>)}</tbody>
          </table></div>
        </section>
      </div>
    </main>
  );
}
