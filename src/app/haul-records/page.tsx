'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Shift={id:string;shift_date:string;shift_kind:'day'|'night'};
type Equipment={id:string;equipment_code:string};
type Face={id:string;face_code:string;block_id:string};
type Block={id:string;block_code:string};
type Haul={id:string;shift_id:string;equipment_id:string;material:'ore'|'waste'|'other';source_face_id:string|null;destination_name:string;trip_count:number;volume_m3:number;departed_at:string;arrived_at:string|null;status:string};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const localInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
const toMongoliaIso=(v:string)=>v?new Date(v+':00+08:00').toISOString():null;
const showTime=(v:string|null)=>v?new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)):'—';

export default function HaulRecordsPage(){
 const db=useMemo(()=>createClient(),[]);
 const [shifts,setShifts]=useState<Shift[]>([]);const [equipment,setEquipment]=useState<Equipment[]>([]);const [faces,setFaces]=useState<Face[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [records,setRecords]=useState<Haul[]>([]);
 const [shiftId,setShiftId]=useState('');const [equipmentId,setEquipmentId]=useState('');const [faceId,setFaceId]=useState('');const [material,setMaterial]=useState<'ore'|'waste'|'other'>('ore');const [destination,setDestination]=useState('');const [trips,setTrips]=useState('1');const [departed,setDeparted]=useState(()=>localInput(new Date()));const [arrived,setArrived]=useState('');const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  const [s,e,f,b,h]=await Promise.all([
   db.from('shifts').select('id,shift_date,shift_kind').order('shift_date',{ascending:false}).limit(100),
   db.from('equipment').select('id,equipment_code').eq('is_active',true).order('equipment_code'),
   db.from('mine_faces').select('id,face_code,block_id').eq('is_active',true).order('face_code'),
   db.from('mine_blocks').select('id,block_code').eq('is_active',true).order('block_code'),
   db.from('haul_records').select('id,shift_id,equipment_id,material,source_face_id,destination_name,trip_count,volume_m3,departed_at,arrived_at,status').order('departed_at',{ascending:false}).limit(200)
  ]);
  const err=s.error||e.error||f.error||b.error||h.error;if(err)setError(err.message);else{setShifts((s.data||[]) as Shift[]);setEquipment((e.data||[]) as Equipment[]);setFaces((f.data||[]) as Face[]);setBlocks((b.data||[]) as Block[]);setRecords((h.data||[]) as Haul[]);if(!shiftId&&s.data?.[0])setShiftId(s.data[0].id);}
  setLoading(false);
 },[db,shiftId]);
 useEffect(()=>{void load();},[load]);
 const equipmentMap=useMemo(()=>new Map(equipment.map(x=>[x.id,x.equipment_code])),[equipment]);const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);
 const filtered=records.filter(r=>[equipmentMap.get(r.equipment_id)||'',r.destination_name,r.material].some(v=>v.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');
  if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}if(Number(trips)<1||!Number.isInteger(Number(trips))){setError('Рейсийн тоо 1 буюу түүнээс их бүхэл тоо байна.');setSaving(false);return;}if(arrived&&new Date(arrived)<=new Date(departed)){setError('Ирсэн цаг гарсан цагаас хойш байх ёстой.');setSaving(false);return;}
  const {data:{user}}=await db.auth.getUser();
  const {error:err}=await db.from('haul_records').insert({shift_id:shiftId,equipment_id:equipmentId,material,source_face_id:faceId||null,destination_name:destination.trim(),trip_count:Number(trips),departed_at:toMongoliaIso(departed),arrived_at:toMongoliaIso(arrived),created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Тээвэрлэлтийн бүртгэл хадгалагдлаа.');setTrips('1');setArrived('');setDestination('');await load();}setSaving(false);
 }
 const btn:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
  <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
  <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ТЭЭВРИЙН БҮРТГЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Тээвэрлэлтийн бүртгэл</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Техник, ачилтын эх үүсвэр, буулгах цэг болон рейсийн тоог бүртгэнэ.</p></div>
  {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ рейс бүртгэх</h2>
   <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
    <label style={label}>Ээлж<select required value={shiftId} onChange={e=>setShiftId(e.target.value)} style={input}><option value="">Ээлж сонгох</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.shift_date} · {s.shift_kind==='day'?'Өдөр':'Шөнө'}</option>)}</select></label>
    <label style={label}>Техник<select required value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} style={input}><option value="">Техник сонгох</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.equipment_code}</option>)}</select></label>
    <label style={label}>Ачилтын мөргөцөг<select value={faceId} onChange={e=>setFaceId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{faces.map(f=><option key={f.id} value={f.id}>{blockMap.get(f.block_id)||'Блок'} · {f.face_code}</option>)}</select></label>
    <label style={label}>Материал<select value={material} onChange={e=>setMaterial(e.target.value as 'ore'|'waste'|'other')} style={input}><option value="ore">Хүдэр</option><option value="waste">Хөрс</option><option value="other">Бусад</option></select></label>
    <label style={label}>Буулгах цэг<input required value={destination} onChange={e=>setDestination(e.target.value)} style={input} placeholder="Жишээ: Хүдрийн овоолго A"/></label>
    <label style={label}>Рейсийн тоо<input required type="number" min="1" step="1" value={trips} onChange={e=>setTrips(e.target.value)} style={input}/><small style={{color:'#f4c62f'}}>Тооцоолсон хэмжээ: {(Number(trips)>0?Number(trips)*84:0).toLocaleString('mn-MN')} м³ · 1 рейс = 84 м³</small></label>
    <label style={label}>Ачилтаас гарсан цаг<input required type="datetime-local" value={departed} onChange={e=>setDeparted(e.target.value)} style={input}/></label>
    <label style={label}>Буулгаж ирсэн цаг<input type="datetime-local" value={arrived} onChange={e=>setArrived(e.target.value)} style={input}/></label>
    <button disabled={saving||!shifts.length||!equipment.length} style={btn}><Plus size={15} style={{verticalAlign:'middle'}}/> Бүртгэл хадгалах</button>
   </form>
   {shifts.length===0&&!loading&&<p style={{color:'#e2bd64',fontSize:12,marginBottom:0}}>Эхлээд Ээлжийн бүртгэлээс ээлж үүсгэнэ үү.</p>}
  </section>
  <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Сүүлийн тээвэрлэлтийн бүртгэл</h2><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1010',border:'1px solid #303939',borderRadius:9,padding:'0 10px'}}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Техник, буулгах цэг..." style={{...input,border:0,width:220,padding:'10px 0'}}/></div><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div></div>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:950}}><thead><tr>{['ЭЭЛЖ','ТЕХНИК','МАТЕРИАЛ','АЧИЛТЫН ЦЭГ','БУУЛГАХ ЦЭГ','РЕЙС','ХЭМЖЭЭ М³','ГАРСАН','ИРСЭН','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:10,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={10} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:filtered.length===0?<tr><td colSpan={9} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор тээвэрлэлтийн бүртгэл алга.</td></tr>:filtered.map(r=>{const s=shifts.find(x=>x.id===r.shift_id);const face=faces.find(f=>f.id===r.source_face_id);return <tr key={r.id}><td style={{padding:11,borderBottom:'1px solid #202828'}}>{s?.shift_date||'—'} · {s?.shift_kind==='day'?'Өдөр':'Шөнө'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{equipmentMap.get(r.equipment_id)||'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.material==='ore'?'Хүдэр':r.material==='waste'?'Хөрс':'Бусад'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{face?((blockMap.get(face.block_id)||'')+' · '+face.face_code):'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.destination_name}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{Number(r.trip_count).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{Number(r.volume_m3).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.departed_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.arrived_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.status==='draft'?'Ноорог':r.status==='submitted'?'Илгээсэн':r.status==='approved'?'Баталсан':'Хүчингүй'}</td></tr>;})}
   </tbody></table></div></section>
 </div></main>;
}
