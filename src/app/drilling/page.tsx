'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Drill, Gauge, Plus, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DrillingExcelImport from './import-panel';

type Shift={id:string;shift_date:string;shift_kind:'day'|'night'};
type Equipment={id:string;equipment_code:string};
type Employee={id:string;full_name:string};
type Block={id:string;block_code:string};
type Face={id:string;block_id:string;face_code:string};
type DrillRow={id:string;shift_id:string;equipment_id:string;operator_id:string|null;block_id:string|null;face_id:string|null;drilled_holes:number;drilled_meters:number;engine_hours:number;status:string;notes:string|null};
type HourRow={id:string;shift_id:string;equipment_id:string;operator_id:string|null;start_hours:number;end_hours:number;worked_hours:number;status:string;notes:string|null};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const btn:React.CSSProperties={border:0,borderRadius:9,padding:'11px 16px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
const num=(v:number)=>Number(v||0).toLocaleString('mn-MN',{maximumFractionDigits:2});
export default function DrillingPage(){
 const [tab,setTab]=useState<'drill'|'hours'>('drill');
 const [shifts,setShifts]=useState<Shift[]>([]);const [equipment,setEquipment]=useState<Equipment[]>([]);const [employees,setEmployees]=useState<Employee[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [faces,setFaces]=useState<Face[]>([]);
 const [drills,setDrills]=useState<DrillRow[]>([]);const [hours,setHours]=useState<HourRow[]>([]);
 const [shiftId,setShiftId]=useState('');const [equipmentId,setEquipmentId]=useState('');const [operatorId,setOperatorId]=useState('');const [blockId,setBlockId]=useState('');const [faceId,setFaceId]=useState('');
 const [holes,setHoles]=useState('0');const [meters,setMeters]=useState('0');const [drillHours,setDrillHours]=useState('0');const [startMeter,setStartMeter]=useState('0');const [endMeter,setEndMeter]=useState('0');const [notes,setNotes]=useState('');
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const db=useMemo(()=>createClient(),[]);
 const load=useCallback(async()=>{
  if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  setLoading(true);setError('');
  const [s,e,emp,b,f,d,h]=await Promise.all([
   db.from('shifts').select('id,shift_date,shift_kind').order('shift_date',{ascending:false}).limit(150),
   db.from('equipment').select('id,equipment_code').eq('is_active',true).order('equipment_code'),
   db.from('employees').select('id,full_name').eq('is_active',true).order('full_name'),
   db.from('mine_blocks').select('id,block_code').eq('is_active',true).order('block_code'),
   db.from('mine_faces').select('id,block_id,face_code').eq('is_active',true).order('face_code'),
   db.from('drill_records').select('id,shift_id,equipment_id,operator_id,block_id,face_id,drilled_holes,drilled_meters,engine_hours,status,notes').order('created_at',{ascending:false}).limit(200),
   db.from('equipment_hour_records').select('id,shift_id,equipment_id,operator_id,start_hours,end_hours,worked_hours,status,notes').order('created_at',{ascending:false}).limit(200)
  ]);
  const err=s.error||e.error||emp.error||b.error||f.error||d.error||h.error;
  if(err)setError(err.message);else{setShifts((s.data||[]) as Shift[]);setEquipment((e.data||[]) as Equipment[]);setEmployees((emp.data||[]) as Employee[]);setBlocks((b.data||[]) as Block[]);setFaces((f.data||[]) as Face[]);setDrills((d.data||[]) as DrillRow[]);setHours((h.data||[]) as HourRow[]);if(!shiftId&&s.data?.[0])setShiftId(s.data[0].id);if(!equipmentId&&e.data?.[0])setEquipmentId(e.data[0].id);}
  setLoading(false);
 },[db,shiftId,equipmentId]);
 useEffect(()=>{void load();},[load]);
 const eqMap=useMemo(()=>new Map(equipment.map(x=>[x.id,x.equipment_code])),[equipment]);
 const empMap=useMemo(()=>new Map(employees.map(x=>[x.id,x.full_name])),[employees]);
 const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);
 const faceMap=useMemo(()=>new Map(faces.map(x=>[x.id,x.face_code])),[faces]);
 const shiftMap=useMemo(()=>new Map(shifts.map(x=>[x.id,x])),[shifts]);
 const selectedFaces=faces.filter(f=>!blockId||f.block_id===blockId);
 async function saveDrill(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');
  const h=Number(holes),m=Number(meters),eh=Number(drillHours);
  if(h<0||m<0||eh<0||![h,m,eh].every(Number.isFinite)||(!h&&!m&&!eh)){setError('Цооног, тууш метр эсвэл мото цагийн аль нэгийг зөв оруулна уу.');setSaving(false);return;}
  const {data:{user}}=await db!.auth.getUser();
  const {error:err}=await db!.from('drill_records').insert({shift_id:shiftId,equipment_id:equipmentId,operator_id:operatorId||null,block_id:blockId||null,face_id:faceId||null,drilled_holes:h,drilled_meters:m,engine_hours:eh,notes:notes.trim()||null,created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Өрмийн бүтээлийн бүртгэл хадгалагдлаа.');setHoles('0');setMeters('0');setDrillHours('0');setNotes('');await load();}setSaving(false);
 }
 async function saveHours(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');
  const a=Number(startMeter),b=Number(endMeter);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<a){setError('Мото цагийн эцсийн заалт эхний заалтаас бага байж болохгүй.');setSaving(false);return;}
  const {data:{user}}=await db!.auth.getUser();
  const {error:err}=await db!.from('equipment_hour_records').insert({shift_id:shiftId,equipment_id:equipmentId,operator_id:operatorId||null,start_hours:a,end_hours:b,notes:notes.trim()||null,created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Техникийн мото цаг хадгалагдлаа.');setNotes('');setStartMeter(endMeter);setEndMeter(endMeter);await load();}setSaving(false);
 }
 const status=(s:string)=>s==='approved'?'Баталсан':s==='submitted'?'Илгээсэн':s==='voided'?'Хүчингүй':'Ноорог';
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
 <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
 <div style={{marginBottom:22}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ҮЙЛДВЭРЛЭЛИЙН НЭМЭЛТ БҮРТГЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Өрөмдлөг ба мото цаг</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Өрмийн бүтээл, тууш метр, цооног болон техникийн моточасны заалтыг бүртгэнэ.</p></div>
 {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
 <DrillingExcelImport shifts={shifts} equipment={equipment} employees={employees} blocks={blocks} faces={faces} onImported={()=>void load()}/>
 <div style={{display:'flex',gap:8,marginBottom:16}}><button onClick={()=>{setTab('drill');setError('');setNotice('');}} style={{...btn,background:tab==='drill'?'#f4c62f':'#202929',color:tab==='drill'?'#171717':'#d7dfdc'}}><Drill size={15} style={{verticalAlign:'middle'}}/> Өрмийн бүтээл</button><button onClick={()=>{setTab('hours');setError('');setNotice('');}} style={{...btn,background:tab==='hours'?'#f4c62f':'#202929',color:tab==='hours'?'#171717':'#d7dfdc'}}><Gauge size={15} style={{verticalAlign:'middle'}}/> Мото цаг</button></div>
 <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>{tab==='drill'?'Шинэ өрмийн бүтээл':'Шинэ мото цагийн бүртгэл'}</h2>
 <form onSubmit={tab==='drill'?saveDrill:saveHours} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
 <label style={label}>Ээлж<select required value={shiftId} onChange={e=>setShiftId(e.target.value)} style={input}><option value="">Ээлж сонгох</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.shift_date} · {s.shift_kind==='day'?'Өдөр':'Шөнө'}</option>)}</select></label>
 <label style={label}>Техник<select required value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} style={input}><option value="">Техник сонгох</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.equipment_code}</option>)}</select></label>
 <label style={label}>Оператор<select value={operatorId} onChange={e=>setOperatorId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{employees.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
 {tab==='drill'?<><label style={label}>Блок<select value={blockId} onChange={e=>{setBlockId(e.target.value);setFaceId('');}} style={input}><option value="">Сонгоогүй</option>{blocks.map(x=><option key={x.id} value={x.id}>{x.block_code}</option>)}</select></label><label style={label}>Мөргөцөг<select value={faceId} onChange={e=>setFaceId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{selectedFaces.map(x=><option key={x.id} value={x.id}>{x.face_code}</option>)}</select></label><label style={label}>Цооногийн тоо<input type="number" min="0" step="0.01" value={holes} onChange={e=>setHoles(e.target.value)} style={input}/></label><label style={label}>Өрөмдсөн тууш метр<input type="number" min="0" step="0.01" value={meters} onChange={e=>setMeters(e.target.value)} style={input}/></label><label style={label}>Мото цаг<input type="number" min="0" step="0.01" value={drillHours} onChange={e=>setDrillHours(e.target.value)} style={input}/></label></>:<><label style={label}>Эхний мото цаг<input required type="number" min="0" step="0.01" value={startMeter} onChange={e=>setStartMeter(e.target.value)} style={input}/></label><label style={label}>Эцсийн мото цаг<input required type="number" min="0" step="0.01" value={endMeter} onChange={e=>setEndMeter(e.target.value)} style={input}/></label><div style={{color:'#aeb9b6',fontSize:12,padding:10,background:'#0b1010',borderRadius:9}}>Ажилласан цаг: <b style={{color:'#f4c62f'}}>{num(Math.max(0,Number(endMeter)-Number(startMeter)))} цаг</b></div></>}
 <label style={{...label,gridColumn:'1 / -1'}}>Тайлбар<input value={notes} onChange={e=>setNotes(e.target.value)} style={input} placeholder="Нэмэлт тайлбар..."/></label>
 <button disabled={saving||!shiftId||!equipmentId||!db} style={{...btn,opacity:saving||!shiftId||!equipmentId||!db?0.55:1}}><Plus size={15} style={{verticalAlign:'middle'}}/> {saving?'Хадгалж байна...':'Бүртгэл хадгалах'}</button>
 </form></section>
 <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2 style={{fontSize:16,margin:0}}>Сүүлийн бүртгэлүүд</h2><button onClick={()=>void load()} style={{...btn,background:'#202929',color:'#e7eeea'}}><RefreshCw size={14} style={{verticalAlign:'middle'}}/> Шинэчлэх</button></div>
 {loading?<p style={{color:'#899393'}}>Уншиж байна...</p>:tab==='drill'?<div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr>{['Ээлж','Техник','Блок','Оператор','Цооног','Тууш метр','Мото цаг','Төлөв'].map(x=><th key={x} style={{textAlign:'left',padding:10,color:'#9eaaa5',borderBottom:'1px solid #303939'}}>{x}</th>)}</tr></thead><tbody>{drills.map(r=><tr key={r.id}>{[shiftMap.get(r.shift_id)?.shift_date+' · '+(shiftMap.get(r.shift_id)?.shift_kind==='day'?'Өдөр':'Шөнө'),eqMap.get(r.equipment_id),blockMap.get(r.block_id||'')||'—',empMap.get(r.operator_id||'')||'—',num(r.drilled_holes),num(r.drilled_meters),num(r.engine_hours),status(r.status)].map((v,i)=><td key={i} style={{padding:10,borderBottom:'1px solid #252d2d',whiteSpace:'nowrap'}}>{v}</td>)}</tr>)}</tbody></table>{!drills.length&&<p style={{color:'#899393'}}>Бүртгэл алга.</p>}</div>:<div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr>{['Ээлж','Техник','Оператор','Эхний заалт','Эцсийн заалт','Ажилласан цаг','Төлөв'].map(x=><th key={x} style={{textAlign:'left',padding:10,color:'#9eaaa5',borderBottom:'1px solid #303939'}}>{x}</th>)}</tr></thead><tbody>{hours.map(r=><tr key={r.id}>{[shiftMap.get(r.shift_id)?.shift_date+' · '+(shiftMap.get(r.shift_id)?.shift_kind==='day'?'Өдөр':'Шөнө'),eqMap.get(r.equipment_id),empMap.get(r.operator_id||'')||'—',num(r.start_hours),num(r.end_hours),num(r.worked_hours),status(r.status)].map((v,i)=><td key={i} style={{padding:10,borderBottom:'1px solid #252d2d',whiteSpace:'nowrap'}}>{v}</td>)}</tr>)}</tbody></table>{!hours.length&&<p style={{color:'#899393'}}>Бүртгэл алга.</p>}</div>}
 </section><p style={{color:'#71807b',fontSize:11}}>Тууш метр нь өрөмдлөгийн урт; мото цаг нь цагийн заалтын зөрүү. Эдгээрийг олборлолтын м³-тэй нэгтгэхгүй.</p>
 </div></main>;
}
