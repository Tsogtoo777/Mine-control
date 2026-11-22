'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Plus, RefreshCw, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Employee = { id: string; full_name: string; position: string | null };
type Shift = { id: string; shift_date: string; shift_kind: 'day' | 'night'; starts_at: string; ends_at: string; status: string; supervisor_id: string | null };

const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#0b1010', color: '#f5f5f0', border: '1px solid #303939', borderRadius: 9, padding: '11px 12px' };
const label: React.CSSProperties = { display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 };
const panel: React.CSSProperties = { background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 };

function shiftTimes(date: string, kind: 'day' | 'night') {
  const startTime = kind === 'day' ? '07:00:00' : '19:00:00';
  const endDate = kind === 'day' ? date : (() => { const d = new Date(date + 'T12:00:00+08:00'); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); })();
  const endTime = kind === 'day' ? '19:00:00' : '07:00:00';
  return { starts_at: date + 'T' + startTime + '+08:00', ends_at: endDate + 'T' + endTime + '+08:00' };
}
function formatTime(value: string) { return new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)); }
function formatDate(value: string) { return new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value+'T12:00:00+08:00')); }

export default function ShiftsPage() {
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar'}).format(new Date()));
  const [kind,setKind]=useState<'day'|'night'>('day');
  const [supervisor,setSupervisor]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    setLoading(true); setError('');
    const db=createClient();
    if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
    const [s,e]=await Promise.all([
      db.from('shifts').select('id,shift_date,shift_kind,starts_at,ends_at,status,supervisor_id').order('shift_date',{ascending:false}).limit(100),
      db.from('employees').select('id,full_name,position').eq('is_active',true).order('full_name')
    ]);
    if(s.error||e.error) setError((s.error||e.error)!.message);
    else {setShifts((s.data||[]) as Shift[]);setEmployees((e.data||[]) as Employee[]);}
    setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);

  async function createShift(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError('');setNotice('');
    const db=createClient();
    if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}
    const times=shiftTimes(date,kind);
    const {data:{user}}=await db.auth.getUser();
    const {error:err}=await db.from('shifts').insert({
      shift_date:date,shift_kind:kind,...times,supervisor_id:supervisor||null,created_by:user?.id||null
    });
    if(err) setError(err.code==='23505'?'Энэ өдөр, ээлжийн бүртгэл давхардсан байна.':err.message);
    else {setNotice('Ээлж амжилттай бүртгэгдлээ.');setSupervisor('');await load();}
    setSaving(false);
  }

  const button:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
  return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap',marginBottom:24}}>
        <div><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ҮЙЛ АЖИЛЛАГААНЫ БҮРТГЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Ээлжийн бүртгэл</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Ээлжийн огноог эхэлсэн өдрөөр тооцно · Монголын цаг (UTC+8)</p></div>
        <div style={{display:'flex',gap:18,color:'#f4c62f'}}><b><CalendarDays size={17} style={{verticalAlign:'middle'}}/> {shifts.length} ээлж</b><b><Users size={17} style={{verticalAlign:'middle'}}/> {employees.length} ажилтан</b></div>
      </div>
      {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
      <section style={panel}>
        <h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ ээлж бүртгэх</h2>
        <form onSubmit={createShift} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
          <label style={label}>Ээлж эхлэх огноо<input type="date" required value={date} onChange={e=>setDate(e.target.value)} style={input}/></label>
          <label style={label}>Ээлжийн төрөл<select value={kind} onChange={e=>setKind(e.target.value as 'day'|'night')} style={input}><option value="day">Өдрийн ээлж · 07:00–19:00</option><option value="night">Шөнийн ээлж · 19:00–07:00 (+1 өдөр)</option></select></label>
          <label style={label}>Ээлжийн мастер / ахлагч<select value={supervisor} onChange={e=>setSupervisor(e.target.value)} style={input}><option value="">Сонгоогүй</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}{e.position?' · '+e.position:''}</option>)}</select></label>
          <button disabled={saving} style={button}><Plus size={15} style={{verticalAlign:'middle'}}/> Ээлж үүсгэх</button>
        </form>
        <div style={{display:'flex',gap:8,alignItems:'center',color:'#899393',fontSize:12,marginTop:14}}><Clock3 size={15}/> {kind==='day'?'07:00–19:00':'19:00–маргааш 07:00'} · Огноо нь ээлж эхэлсэн өдөр</div>
      </section>
      <section style={panel}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Бүртгэгдсэн ээлжүүд</h2><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:650}}><thead><tr>{['ОГНОО','ЭЭЛЖ','ЭХЛЭХ','ДУУСАХ','ЭЭЛЖИЙН МАСТЕР','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:11,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
          {loading?<tr><td colSpan={6} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:shifts.length===0?<tr><td colSpan={6} style={{padding:28,textAlign:'center',color:'#899393'}}>Ээлжийн бүртгэл хараахан алга.</td></tr>:shifts.map(s=><tr key={s.id}><td style={{padding:12,borderBottom:'1px solid #202828'}}>{formatDate(s.shift_date)}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:'#f4c62f'}}>{s.shift_kind==='day'?'Өдөр':'Шөнө'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{formatTime(s.starts_at)}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{formatDate(s.ends_at.slice(0,10))} · {formatTime(s.ends_at)}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{employees.find(e=>e.id===s.supervisor_id)?.full_name||'—'}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:s.status==='approved'?'#8cdaa7':'#d6bd71'}}>{s.status==='draft'?'Ноорог':s.status==='submitted'?'Илгээсэн':s.status==='approved'?'Баталсан':'Хүчингүй'}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  </main>;
}
