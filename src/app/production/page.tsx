'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pickaxe, Plus, RefreshCw, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Shift={id:string;shift_date:string;shift_kind:'day'|'night'};
type Block={id:string;block_code:string;area_id:string};
type Area={id:string;area_name:string};
type Face={id:string;block_id:string;face_code:string};
type Work={id:string;record_no:number;work_type:string;started_at:string};
type Production={id:string;shift_id:string;block_id:string|null;face_id:string|null;material:'ore'|'waste'|'other';volume_m3:number;tonnes:number|null;measured_at:string;work_record_id:string|null;status:string};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const localInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
const toMongoliaIso=(v:string)=>v?new Date(v+':00+08:00').toISOString():null;
const showTime=(v:string)=>new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));

export default function ProductionPage(){
 const [shifts,setShifts]=useState<Shift[]>([]);const [areas,setAreas]=useState<Area[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [faces,setFaces]=useState<Face[]>([]);const [works,setWorks]=useState<Work[]>([]);const [records,setRecords]=useState<Production[]>([]);
 const [shiftId,setShiftId]=useState('');const [blockId,setBlockId]=useState('');const [faceId,setFaceId]=useState('');const [material,setMaterial]=useState<'ore'|'waste'|'other'>('ore');const [volume,setVolume]=useState('');const [tonnes,setTonnes]=useState('');const [measuredAt,setMeasuredAt]=useState(()=>localInput(new Date()));const [workRecordId,setWorkRecordId]=useState('');const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const db=createClient();
 const load=useCallback(async()=>{setLoading(true);setError('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  const [s,a,b,f,w,p]=await Promise.all([
   db.from('shifts').select('id,shift_date,shift_kind').order('shift_date',{ascending:false}).limit(100),
   db.from('mine_areas').select('id,area_name').eq('is_active',true).order('area_name'),
   db.from('mine_blocks').select('id,block_code,area_id').eq('is_active',true).order('block_code'),
   db.from('mine_faces').select('id,block_id,face_code').eq('is_active',true).order('face_code'),
   db.from('work_records').select('id,record_no,work_type,started_at').order('started_at',{ascending:false}).limit(200),
   db.from('production_records').select('id,shift_id,block_id,face_id,material,volume_m3,tonnes,measured_at,work_record_id,status').order('measured_at',{ascending:false}).limit(200)
  ]);
  const err=s.error||a.error||b.error||f.error||w.error||p.error;if(err)setError(err.message);else{setShifts((s.data||[]) as Shift[]);setAreas((a.data||[]) as Area[]);setBlocks((b.data||[]) as Block[]);setFaces((f.data||[]) as Face[]);setWorks((w.data||[]) as Work[]);setRecords((p.data||[]) as Production[]);if(!shiftId&&s.data?.[0])setShiftId(s.data[0].id);}
  setLoading(false);
 },[db,shiftId]);
 useEffect(()=>{void load();},[load]);
 const areaMap=useMemo(()=>new Map(areas.map(x=>[x.id,x.area_name])),[areas]);const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);
 const filtered=records.filter(r=>[blockMap.get(r.block_id||''),r.material,String(r.volume_m3)].some(v=>(v||'').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');
  if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}if(Number(volume)<=0){setError('Олборлосон хэмжээ 0-ээс их байх ёстой.');setSaving(false);return;}
  const {data:{user}}=await db.auth.getUser();
  const {error:err}=await db.from('production_records').insert({shift_id:shiftId,block_id:blockId||null,face_id:faceId||null,material,volume_m3:Number(volume),tonnes:tonnes.trim()===''?null:Number(tonnes),measured_at:toMongoliaIso(measuredAt),work_record_id:workRecordId||null,created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Олборлолтын бүртгэл хадгалагдлаа.');setVolume('');setTonnes('');setWorkRecordId('');await load();}setSaving(false);
 }
 const btn:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
  <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
  <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ҮЙЛДВЭРЛЭЛИЙН БҮРТГЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Олборлолтын бүртгэл</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Ээлж, блок, мөргөцөг болон олборлосон хэмжээ (м³)-г бүртгэнэ.</p></div>
  {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ олборлолт бүртгэх</h2>
   <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
    <label style={label}>Ээлж<select required value={shiftId} onChange={e=>setShiftId(e.target.value)} style={input}><option value="">Ээлж сонгох</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.shift_date} · {s.shift_kind==='day'?'Өдөр':'Шөнө'}</option>)}</select></label>
    <label style={label}>Блок<select value={blockId} onChange={e=>{setBlockId(e.target.value);setFaceId('');}} style={input}><option value="">Сонгоогүй</option>{blocks.map(b=><option key={b.id} value={b.id}>{areaMap.get(b.area_id)||'Талбай'} · {b.block_code}</option>)}</select></label>
    <label style={label}>Мөргөцөг<select value={faceId} onChange={e=>setFaceId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{faces.filter(f=>!blockId||f.block_id===blockId).map(f=><option key={f.id} value={f.id}>{blockMap.get(f.block_id)} · {f.face_code}</option>)}</select></label>
    <label style={label}>Материал<select value={material} onChange={e=>setMaterial(e.target.value as 'ore'|'waste'|'other')} style={input}><option value="ore">Хүдэр</option><option value="waste">Хөрс</option><option value="other">Бусад</option></select></label>
    <label style={label}>Олборлосон хэмжээ (м³)<input required type="number" min="0.01" step="0.01" value={volume} onChange={e=>setVolume(e.target.value)} style={input} placeholder="Жишээ: 1250"/></label><label style={label}>Хүдэр / материалын жин (тн)<input type="number" min="0" step="0.01" value={tonnes} onChange={e=>setTonnes(e.target.value)} style={input} placeholder="Заавал биш"/></label>
    <label style={label}>Бүртгэсэн огноо, цаг<input required type="datetime-local" value={measuredAt} onChange={e=>setMeasuredAt(e.target.value)} style={input}/></label>
    <label style={{...label,gridColumn:'span 2'}}>Уулын ажлын бүртгэлтэй холбох (заавал биш)<select value={workRecordId} onChange={e=>setWorkRecordId(e.target.value)} style={input}><option value="">Холбохгүй</option>{works.map(w=><option key={w.id} value={w.id}>№{w.record_no} · {w.work_type} · {showTime(w.started_at)}</option>)}</select></label>
    <button disabled={saving||!shifts.length} style={btn}><Plus size={15} style={{verticalAlign:'middle'}}/> Бүртгэл хадгалах</button>
   </form>
   {shifts.length===0&&!loading&&<p style={{color:'#e2bd64',fontSize:12,marginBottom:0}}>Эхлээд Ээлжийн бүртгэлээс ээлж үүсгэнэ үү.</p>}
  </section>
  <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Сүүлийн олборлолтын бүртгэл</h2><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1010',border:'1px solid #303939',borderRadius:9,padding:'0 10px'}}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Блок, материал, хэмжээ..." style={{...input,border:0,width:220,padding:'10px 0'}}/></div><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div></div>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:850}}><thead><tr>{['ЭЭЛЖ','БЛОК / МӨРГӨЦӨГ','МАТЕРИАЛ','ХЭМЖЭЭ М³','ЖИН ТН','БҮРТГЭСЭН ЦАГ','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:10,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={7} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:filtered.length===0?<tr><td colSpan={6} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор олборлолтын бүртгэл алга.</td></tr>:filtered.map(r=>{const s=shifts.find(x=>x.id===r.shift_id);return <tr key={r.id}><td style={{padding:11,borderBottom:'1px solid #202828'}}>{s?.shift_date||'—'} · {s?.shift_kind==='day'?'Өдөр':'Шөнө'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{blockMap.get(r.block_id||'')||'—'}{r.face_id?' / '+(faces.find(f=>f.id===r.face_id)?.face_code||''):''}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.material==='ore'?'Хүдэр':r.material==='waste'?'Хөрс':'Бусад'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{Number(r.volume_m3).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.tonnes==null?'—':Number(r.tonnes).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.measured_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.status==='draft'?'Ноорог':r.status==='submitted'?'Илгээсэн':r.status==='approved'?'Баталсан':'Хүчингүй'}</td></tr>;})}
   </tbody></table></div></section>
 </div></main>;
}
