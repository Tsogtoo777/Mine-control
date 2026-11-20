'use client';

import { FormEvent, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, LoaderCircle, Plus, RefreshCw, Search, UserRound, UserX, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Employee = {
  id: string;
  employee_code: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  is_active: boolean;
};

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0b1010', color: '#f5f5f0',
  border: '1px solid #303939', borderRadius: 9, padding: '11px 12px', outline: 'none',
};

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase тохиргоо олдсонгүй. Environment Variables-ийг шалгана уу.');
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, position, department, is_active')
      .order('full_name', { ascending: true });
    if (queryError) setError(queryError.message);
    else setRows((data ?? []) as Employee[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadEmployees(); }, [loadEmployees]);

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('employees').insert({
      employee_code: code.trim() || null,
      full_name: name.trim(),
      position: position.trim() || null,
      department: department.trim() || null,
    });
    if (insertError) setError(insertError.code === '23505' ? 'Энэ ажилтны код өмнө бүртгэгдсэн байна.' : insertError.message);
    else {
      setCode(''); setName(''); setPosition(''); setDepartment('');
      setNotice('Ажилтан амжилттай бүртгэгдлээ.');
      await loadEmployees();
    }
    setSaving(false);
  }

  async function toggleActive(employee: Employee) {
    setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); return; }
    const { error: updateError } = await supabase.from('employees')
      .update({ is_active: !employee.is_active }).eq('id', employee.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(employee.is_active ? 'Ажилтныг идэвхгүй болголоо.' : 'Ажилтныг идэвхжүүллээ.');
      await loadEmployees();
    }
  }

  const filtered = rows.filter((r) => [r.employee_code, r.full_name, r.position, r.department]
    .some((v) => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));

  return (
    <main style={{ minHeight: '100vh', background: '#090b0b', color: '#f5f5f0', padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <div>
            <a href="/" style={{ color: '#f4c62f', textDecoration: 'none', display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 13, marginBottom: 16 }}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
            <div style={{ color: '#f4c62f', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>УДИРДЛАГА / ХҮНИЙ НӨӨЦ</div>
            <h1 style={{ fontSize: 28, margin: '8px 0' }}>Ажилтны бүртгэл</h1>
            <p style={{ color: '#899393', fontSize: 13, margin: 0 }}>Ажилтны мэдээллийг Supabase өгөгдлийн сантай шууд холбож бүртгэнэ.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#f4c62f' }}><Users size={22}/><b>{rows.length} ажилтан</b></div>
        </header>

        {(error || notice) && <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 9, border: '1px solid '+(error ? '#7f3434' : '#376447'), background: error ? '#351b1b' : '#14251b', color: error ? '#ffb5a8' : '#a8e6bd', fontSize: 13 }}>{error || notice}</div>}

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Шинэ ажилтан бүртгэх</h2>
          <form onSubmit={addEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Ажилтны код<input style={inputStyle} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ж: 10025"/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Овог нэр<input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="Овог нэр" required/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Албан тушаал<input style={inputStyle} value={position} onChange={e=>setPosition(e.target.value)} placeholder="Албан тушаал"/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Хэлтэс<input style={inputStyle} value={department} onChange={e=>setDepartment(e.target.value)} placeholder="Хэлтэс"/></label>
            <button disabled={saving} type="submit" style={{ height: 42, border: 0, borderRadius: 9, background: '#f4c62f', color: '#171717', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: saving ? 'wait' : 'pointer' }}>{saving ? <LoaderCircle size={16}/> : <Plus size={16}/>} Бүртгэх</button>
          </form>
          <p style={{ color: '#7d8986', fontSize: 11, margin: '12px 0 0' }}>Ажилтан нэмэх, идэвхтэй төлөв өөрчлөх эрхийг Supabase RLS шалгана. Админ болон удирдлагын эрх шаардлагатай.</p>
        </section>

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Ажилтны жагсаалт</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1010', border: '1px solid #303939', borderRadius: 9, padding: '0 10px' }}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Код, нэр, албан тушаал..." style={{ ...inputStyle, border: 0, width: 220, padding: '10px 0' }}/></div>
              <button onClick={()=>void loadEmployees()} style={{ border: '1px solid #303939', borderRadius: 9, padding: '9px 11px', background: '#171e1e', color: '#dce3df', cursor: 'pointer' }}><RefreshCw size={16}/></button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
              <thead><tr>{['КОД','ОВОГ НЭР','АЛБАН ТУШААЛ','ХЭЛТЭС','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, letterSpacing: 1, padding: 12, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><LoaderCircle size={18}/> Уншиж байна...</td></tr> :
                 filtered.length === 0 ? <tr><td colSpan={6} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><UserRound size={20}/><div style={{ marginTop: 8 }}>{rows.length ? 'Хайлтад тохирох ажилтан олдсонгүй.' : 'Одоогоор ажилтан бүртгээгүй байна.'}</div></td></tr> :
                 filtered.map(e=><tr key={e.id}>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#f4c62f' }}>{e.employee_code || '—'}</td>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828', fontWeight: 700 }}>{e.full_name}</td>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.position || '—'}</td>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.department || '—'}</td>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><span style={{ color: e.is_active ? '#8cdaa7' : '#f1a29a' }}>{e.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}</span></td>
                   <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><button onClick={()=>void toggleActive(e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #303939', borderRadius: 7, color: '#cbd4d0', padding: '7px 9px', cursor: 'pointer' }}>{e.is_active ? <UserX size={14}/> : <UserRound size={14}/>} {e.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</button></td>
                 </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
