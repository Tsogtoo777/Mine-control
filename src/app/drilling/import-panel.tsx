'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, Upload, Download, RefreshCw } from 'lucide-react';

type Shift = { id: string; shift_date: string; shift_kind: 'day' | 'night' };
type Equipment = { id: string; equipment_code: string };
type Employee = { id: string; employee_code?: string | null; full_name: string };
type Block = { id: string; block_code: string };
type Face = { id: string; block_id: string; face_code: string };
type Parsed = {
  sheet: 'drill' | 'hours'; row: number; shift_date: string; shift_kind: 'day' | 'night';
  equipment_code: string; operator: string; block_code: string; face_code: string;
  drilled_holes: number; drilled_meters: number; engine_hours: number;
  start_hours: number; end_hours: number; notes: string;
  shift_id?: string; equipment_id?: string; operator_id?: string | null;
  block_id?: string | null; face_id?: string | null; issue?: string;
};
const norm = (v: unknown) => String(v ?? '').trim().toLocaleLowerCase();
const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => v === '' || v == null ? 0 : Number(v);
const headers = {
  drill: ['Ээлжийн огноо (YYYY-MM-DD)', 'Ээлж (Өдөр/Шөнө)', 'Техникийн код', 'Операторын код эсвэл бүтэн нэр', 'Блокийн код', 'Мөргөцгийн код', 'Цооногийн тоо', 'Өрөмдсөн тууш метр', 'Өрмийн мото цаг', 'Тайлбар'],
  hours: ['Ээлжийн огноо (YYYY-MM-DD)', 'Ээлж (Өдөр/Шөнө)', 'Техникийн код', 'Операторын код эсвэл бүтэн нэр', 'Эхний мото цаг', 'Эцсийн мото цаг', 'Тайлбар'],
};
function template() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers.drill]), 'Өрмийн бүтээл');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers.hours]), 'Мото цаг');
  XLSX.writeFile(wb, 'MINE_CONTROL_Өрөмдлөг_МотоЦаг_загвар.xlsx');
}
function parseSheet(wb: XLSX.WorkBook, name: string, kind: 'drill' | 'hours'): Parsed[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  return rows.slice(1).map((r, i) => {
    const c = Array.isArray(r) ? r : [];
    const shiftRaw = norm(c[1]);
    const shift_kind = (shiftRaw === 'өдөр' || shiftRaw === 'day' ? 'day' : 'night') as 'day' | 'night';
    const base = {
      sheet: kind, row: i + 2, shift_date: str(c[0]).slice(0, 10), shift_kind,
      equipment_code: str(c[2]).toUpperCase(), operator: str(c[3]),
      block_code: kind === 'drill' ? str(c[4]).toUpperCase() : '',
      face_code: kind === 'drill' ? str(c[5]).toUpperCase() : '',
      drilled_holes: kind === 'drill' ? num(c[6]) : 0,
      drilled_meters: kind === 'drill' ? num(c[7]) : 0,
      engine_hours: kind === 'drill' ? num(c[8]) : 0,
      start_hours: kind === 'hours' ? num(c[4]) : 0,
      end_hours: kind === 'hours' ? num(c[5]) : 0,
      notes: str(c[kind === 'drill' ? 9 : 6]),
    };
    let issue = '';
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(base.shift_date)) issue = 'Ээлжийн огноо YYYY-MM-DD байх ёстой';
    else if (!shiftRaw || !['өдөр', 'шөнө', 'day', 'night'].includes(shiftRaw)) issue = 'Ээлж Өдөр эсвэл Шөнө байх ёстой';
    else if (!base.equipment_code) issue = 'Техникийн код дутуу';
    else if (kind === 'drill' && [base.drilled_holes, base.drilled_meters, base.engine_hours].some(x => !Number.isFinite(x) || x < 0)) issue = 'Өрмийн тоон утга буруу';
    else if (kind === 'drill' && !base.drilled_holes && !base.drilled_meters && !base.engine_hours) issue = 'Цооног, метр, мото цагийн аль нэгийг оруул';
    else if (kind === 'hours' && (!Number.isFinite(base.start_hours) || !Number.isFinite(base.end_hours) || base.start_hours < 0 || base.end_hours < base.start_hours)) issue = 'Мото цагийн заалт буруу';
    return { ...base, issue: issue || undefined };
  }).filter(r => r.shift_date || r.equipment_code || r.operator);
}
function key(r: Parsed) {
  return [r.shift_id, r.equipment_id, r.operator_id || '', r.sheet === 'drill' ? 'd' : 'h',
    r.sheet === 'drill' ? [r.block_id || '', r.face_id || '', r.drilled_holes, r.drilled_meters, r.engine_hours].join('|') : [r.start_hours, r.end_hours].join('|')].join('::');
}

export default function DrillingExcelImport({ shifts, equipment, employees, blocks, faces, onImported }: {
  shifts: Shift[]; equipment: Equipment[]; employees: Employee[]; blocks: Block[]; faces: Face[]; onImported: () => void;
}) {
  const [rows, setRows] = useState<Parsed[]>([]);
  const [fileName, setFileName] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const validCount = rows.filter(r => !r.issue).length;
  const ready = useMemo(() => rows.filter(r => !r.issue), [rows]);

  async function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setError(''); setMessage(''); setRows([]); setChecked(false); setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const parsed = [
        ...parseSheet(wb, 'Өрмийн бүтээл', 'drill'),
        ...parseSheet(wb, 'Мото цаг', 'hours'),
      ];
      if (!parsed.length) throw new Error('Өрмийн бүтээл эсвэл Мото цаг гэсэн нэртэй хуудас, өгөгдөл олдсонгүй.');
      setRows(parsed); setMessage(parsed.length + ' мөр уншлаа. Одоо шалгана уу.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Excel файл уншихад алдаа гарлаа.'); }
    e.target.value = '';
  }

  async function validate() {
    setBusy(true); setError(''); setMessage('');
    const db = createClient();
    if (!db) { setError('Supabase тохиргоо олдсонгүй.'); setBusy(false); return; }
    const [dr, hr] = await Promise.all([
      db.from('drill_records').select('shift_id,equipment_id,operator_id,block_id,face_id,drilled_holes,drilled_meters,engine_hours').limit(5000),
      db.from('equipment_hour_records').select('shift_id,equipment_id,operator_id,start_hours,end_hours').limit(5000),
    ]);
    if (dr.error || hr.error) { setError('Өмнөх бүртгэл шалгаж чадсангүй: ' + (dr.error || hr.error)?.message); setBusy(false); return; }
    const seen = new Set<string>();
    (dr.data || []).forEach((x: any) => seen.add(['d',x.shift_id,x.equipment_id,x.operator_id||'',x.block_id||'',x.face_id||'',x.drilled_holes,x.drilled_meters,x.engine_hours].join('::')));
    (hr.data || []).forEach((x: any) => seen.add(['h',x.shift_id,x.equipment_id,x.operator_id||'',x.start_hours,x.end_hours].join('::')));
    const local = new Set<string>();
    const next = rows.map(r => {
      if (r.issue) return r;
      const shift = shifts.find(s => s.shift_date === r.shift_date && s.shift_kind === r.shift_kind);
      const eq = equipment.find(x => norm(x.equipment_code) === norm(r.equipment_code));
      const emp = r.operator ? employees.find(x => norm(x.employee_code) === norm(r.operator) || norm(x.full_name) === norm(r.operator)) : undefined;
      const block = r.block_code ? blocks.find(x => norm(x.block_code) === norm(r.block_code)) : undefined;
      const face = r.face_code ? faces.find(x => norm(x.face_code) === norm(r.face_code) && (!block || x.block_id === block.id)) : undefined;
      let issue = !shift ? 'Системд тохирох ээлж алга' : !eq ? 'Техникийн код олдсонгүй' : r.operator && !emp ? 'Оператор олдсонгүй' : r.block_code && !block ? 'Блок олдсонгүй' : r.face_code && !face ? 'Мөргөцөг олдсонгүй' : '';
      const resolved = { ...r, shift_id: shift?.id, equipment_id: eq?.id, operator_id: emp?.id || null, block_id: block?.id || null, face_id: face?.id || null };
      const duplicateKey = r.sheet === 'drill'
        ? ['d',resolved.shift_id,resolved.equipment_id,resolved.operator_id||'',resolved.block_id||'',resolved.face_id||'',r.drilled_holes,r.drilled_meters,r.engine_hours].join('::')
        : ['h',resolved.shift_id,resolved.equipment_id,resolved.operator_id||'',r.start_hours,r.end_hours].join('::');
      if (!issue && (seen.has(duplicateKey) || local.has(duplicateKey))) issue = 'Өмнө бүртгэгдсэн эсвэл Excel дотор давхардсан';
      local.add(duplicateKey);
      return { ...resolved, issue: issue || undefined };
    });
    setRows(next); setChecked(true);
    setMessage('Шалгалт: ' + next.filter(r => !r.issue).length + ' импортлох, ' + next.filter(r => r.issue).length + ' алгасах мөр.');
    setBusy(false);
  }

  async function importRows() {
    const db = createClient(); if (!db || !checked || !ready.length) return;
    setBusy(true); setError(''); setMessage('');
    const { data: { user } } = await db.auth.getUser();
    let imported = 0;
    for (const kind of ['drill', 'hours'] as const) {
      const batchRows = ready.filter(r => r.sheet === kind);
      for (let i = 0; i < batchRows.length; i += 25) {
        const payload = batchRows.slice(i, i + 25).map(r => kind === 'drill' ? ({
          shift_id: r.shift_id, equipment_id: r.equipment_id, operator_id: r.operator_id,
          block_id: r.block_id, face_id: r.face_id, drilled_holes: r.drilled_holes,
          drilled_meters: r.drilled_meters, engine_hours: r.engine_hours, notes: r.notes || null, created_by: user?.id || null,
        }) : ({
          shift_id: r.shift_id, equipment_id: r.equipment_id, operator_id: r.operator_id,
          start_hours: r.start_hours, end_hours: r.end_hours, notes: r.notes || null, created_by: user?.id || null,
        }));
        const { data, error: insertError } = await db.from(kind === 'drill' ? 'drill_records' : 'equipment_hour_records').insert(payload).select('id');
        if (insertError) { setError(imported + ' мөр хадгалсны дараа зогслоо: ' + insertError.message); setBusy(false); onImported(); return; }
        imported += data?.length ?? payload.length;
      }
    }
    setMessage(imported + ' мөр амжилттай импортоллоо. Алдаатай/давхардсан ' + (rows.length - ready.length) + ' мөр алгасав.');
    setRows([]); setFileName(''); setChecked(false); setBusy(false); onImported();
  }

  return <section style={{ background:'#111515', border:'1px solid #252d2d', borderRadius:14, padding:20, marginBottom:18 }}>
    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}><FileSpreadsheet color="#f4c62f" size={19}/><h2 style={{fontSize:16,margin:0}}>Excel-ээс өрөмдлөг, мото цаг импортлох</h2></div>
    <p style={{color:'#899393',fontSize:12,marginTop:0}}>Загвар татаж бөглөнө. Импортын өмнө ээлж, техник, оператор, блок, мөргөцөг болон давхардлыг шалгана.</p>
    {(error || message) && <div role="status" style={{padding:10,marginBottom:12,borderRadius:8,background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:12}}>{error || message}</div>}
    <div style={{display:'flex',gap:9,flexWrap:'wrap',alignItems:'center'}}>
      <button type="button" onClick={template} style={{display:'inline-flex',gap:7,alignItems:'center',border:'1px solid #394343',borderRadius:9,padding:'10px 13px',background:'#202727',color:'#f4c62f',fontWeight:700,cursor:'pointer'}}><Download size={15}/> Excel загвар татах</button>
      <label style={{display:'inline-flex',gap:7,alignItems:'center',border:'1px solid #394343',borderRadius:9,padding:'10px 13px',background:'#202727',color:'#f4c62f',fontWeight:700,cursor:'pointer'}}><Upload size={15}/> Excel файл сонгох<input type="file" accept=".xlsx,.xls" onChange={chooseFile} style={{display:'none'}}/></label>
      {fileName && <span style={{fontSize:12,color:'#c4cfca'}}>{fileName}</span>}
      {rows.length>0 && <button type="button" disabled={busy} onClick={()=>void validate()} style={{border:0,borderRadius:9,padding:'10px 14px',background:'#e4b92d',color:'#171717',fontWeight:800,cursor:'pointer'}}>{busy?'Шалгаж байна...':'Мэдээлэл шалгах'}</button>}
      {checked && validCount>0 && <button type="button" disabled={busy} onClick={()=>void importRows()} style={{border:0,borderRadius:9,padding:'10px 14px',background:'#183323',color:'#a8e6bd',fontWeight:800,cursor:'pointer'}}>{busy?'Импортолж байна...':validCount+' мөр импортлох'}</button>}
      {rows.length>0 && <button type="button" onClick={()=>{setRows([]);setFileName('');setChecked(false);setError('');setMessage('');}} style={{border:'1px solid #394343',borderRadius:9,padding:'10px 14px',background:'transparent',color:'#c4cfca',cursor:'pointer'}}>Цэвэрлэх</button>}
    </div>
    {rows.length>0 && <div style={{marginTop:14}}>
      <div style={{fontSize:12,color:'#c4cfca',marginBottom:8}}>Нийт {rows.length} мөр · <span style={{color:'#8cdaa7'}}>{checked?validCount:'Шалгалт хүлээж байна'}</span> · <span style={{color:'#f1a29a'}}>{checked?rows.length-validCount:0} алдаатай</span></div>
      <div style={{overflowX:'auto',maxHeight:300,border:'1px solid #293131',borderRadius:9}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
          <thead style={{position:'sticky',top:0,background:'#1a2222'}}><tr>{['Хуудас','Мөр','Огноо','Ээлж','Техник','Оператор','Цооног','Тууш м','Эхлэл','Төгсгөл','Шалгалт'].map(h=><th key={h} style={{textAlign:'left',padding:8,color:'#9ca9a4'}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={i} style={{background:r.issue?'#281b1b':'transparent'}}>{[r.sheet==='drill'?'Өрөмдлөг':'Мото цаг',r.row,r.shift_date,r.shift_kind==='day'?'Өдөр':'Шөнө',r.equipment_code,r.operator||'—',r.sheet==='drill'?r.drilled_holes:'—',r.sheet==='drill'?r.drilled_meters:'—',r.sheet==='hours'?r.start_hours:'—',r.sheet==='hours'?r.end_hours:'—',r.issue|| (checked?'Бэлэн':'Хүлээгдэж буй')].map((v,j)=><td key={j} style={{padding:8,borderTop:'1px solid #263030',whiteSpace:'nowrap',color:j===10&&r.issue?'#f1a29a':undefined}}>{v}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>}
    <p style={{color:'#71807b',fontSize:11,marginBottom:0}}>Хуудасны нэрийг өөрчлөхгүй: “Өрмийн бүтээл”, “Мото цаг”. Ээлжийн огноо нь ээлж эхэлсэн өдөр. Техник, ажилтан, блокийн код системийн бүртгэлтэй яг таарах ёстой.</p>
  </section>;
}
