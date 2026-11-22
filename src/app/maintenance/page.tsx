'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, Search, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Equipment={id:string;equipment_code:string};
type Order={id:string;equipment_id:string;reported_at:string;fault_category:string;description:string;repair_started_at:string|null;repair_finished_at:string|null;returned_at:string|null;status:string};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const localInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
const toIso=(v:string)=>v?new Date(v+':00+08:00').toISOString():null;
const showTime=(v:string|null)=>v?new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)):'—';

export default function MaintenancePage(){
 const db=useMemo(()=>createClient(),[]);
 const [equipment,setEquipment]=useState<Equipment[]>([]);const [records,setRecords]=useState<Order[]>([]);
 const [equipmentId,setEquipmentId]=useState('');const [category,setCategory]=useState('Механик');const [description,setDescription]=useState('');const [reported,setReported]=useState(()=>localInput(new Date()));const [started,setStarted]=useState('');const [finished,setFinished]=useState('');const [returned,setReturned]=useState('');const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  const [e,o]=await Promise.all([
   db.from('equipment').select('id,equipment_code').eq('is_active',true).order('equipment_code'),
   db.from('maintenance_orders').select('id,equipment_id,reported_at,fault_category,description,repair_started_at,repair_finished_at,returned_at,status').order('reported_at',{ascending:false}).limit(200)
  ]);
  const err=e.error||o.error;if(err)setError(err.message);else{setEquipment((e.data||[]) as Equipment[]);setRecords((o.data||[]) as Order[]);if(!equipmentId&&e.data?.[0])setEquipmentId(e.data[0].id);}
  setLoading(false);
 },[db,equipmentId]);
 useEffect(()=>{void load();},[load]);
 const equipmentMap=useMemo(()=>new Map(equipment.map(x=>[x.id,x.equipment_code])),[equipment]);
 const filtered=records.filter(r=>[equipmentMap.get(r.equipment_id)||'',r.fault_category,r.description].some(v=>v.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');
  if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}
  const ordered=[reported,started,finished,returned].filter(Boolean).map(v=>new Date(v).getTime());
  if(ordered.some((v,i)=>i>0&&v<ordered[i-1])){setError('Засварын цагууд дарааллаараа байх ёстой.');setSaving(false);return;}
  const {data:{user}}=await db.auth.getUser();
  const {error:err}=await db.from('maintenance_orders').insert({equipment_id:equipmentId,reported_at:toIso(reported),fault_category:category,description:description.trim(),repair_started_at:toIso(started),repair_finished_at:toIso(finished),returned_at:toIso(returned),created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Засварын бүртгэл хадгалагдлаа.');setDescription('');setStarted('');setFinished('');setReturned('');await load();}setSaving(false);
 }
 const btn:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
  <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
  <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ТЕХНИКИЙН БЭЛЭН БАЙДАЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Засвар үйлчилгээ</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Эвдрэл мэдээлэх, засварын явц болон ашиглалтад буцаасан хугацааг бүртгэнэ.</p></div>
  {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ засварын бүртгэл</h2>
   <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
    <label style={label}>Техник<select required value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} style={input}><option value="">Техник сонгох</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.equipment_code}</option>)}</select></label>
    <label style={label}>Эвдрэлийн төрөл<select value={category} onChange={e=>setCategory(e.target.value)} style={input}>{['Механик','Цахилгаан','Гидравлик','Хөдөлгүүр','Явах эд анги','Дугуй / гинж','Бусад'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label style={label}>Эвдрэл мэдээлсэн цаг<input required type="datetime-local" value={reported} onChange={e=>setReported(e.target.value)} style={input}/></label>
    <label style={label}>Засвар эхэлсэн цаг<input type="datetime-local" value={started} onChange={e=>setStarted(e.target.value)} style={input}/></label>
    <label style={label}>Засвар дууссан цаг<input type="datetime-local" value={finished} onChange={e=>setFinished(e.target.value)} style={input}/></label>
    <label style={label}>Ашиглалтад буцаасан цаг<input type="datetime-local" value={returned} onChange={e=>setReturned(e.target.value)} style={input}/></label>
    <label style={{...label,gridColumn:'span 2'}}>Эвдрэл, засварын тайлбар<input required value={description} onChange={e=>setDescription(e.target.value)} style={input} placeholder="Эвдрэлийн шалтгаан, хийсэн ажил..."/></label>
    <button disabled={saving||!equipment.length} style={btn}><Plus size={15} style={{verticalAlign:'middle'}}/> Бүртгэл хадгалах</button>
   </form>
  </section>
  <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Засварын бүртгэлүүд</h2><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1010',border:'1px solid #303939',borderRadius:9,padding:'0 10px'}}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Техник, эвдрэлийн төрөл..." style={{...input,border:0,width:230,padding:'10px 0'}}/></div><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div></div>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:1000}}><thead><tr>{['ТЕХНИК','ЭВДРЭЛИЙН ТӨРӨЛ','ТАЙЛБАР','МЭДЭЭЛСЭН','ЗАСВАР ЭХЭЛСЭН','ЗАСВАР ДУУССАН','АШИГЛАЛТАД БУЦСАН','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:10,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={8} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:filtered.length===0?<tr><td colSpan={8} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор засварын бүртгэл алга.</td></tr>:filtered.map(r=><tr key={r.id}><td style={{padding:11,borderBottom:'1px solid #202828'}}>{equipmentMap.get(r.equipment_id)||'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.fault_category}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.description}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.reported_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.repair_started_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.repair_finished_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.returned_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.status==='draft'?'Ноорог':r.status==='submitted'?'Илгээсэн':r.status==='approved'?'Баталсан':'Хүчингүй'}</td></tr>)}
   </tbody></table></div>
  </section>
 </div></main>;
}
