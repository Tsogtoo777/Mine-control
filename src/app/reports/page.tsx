'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';

type Shift={id:string;shift_date:string;shift_kind:'day'|'night'};
type Equipment={id:string;equipment_code:string};
type Employee={id:string;full_name:string};
type Area={id:string;area_name:string};
type Block={id:string;area_id:string;block_code:string};
type Face={id:string;block_id:string;face_code:string};
type Work={id:string;record_no:number;shift_id:string;equipment_id:string|null;operator_id:string|null;block_id:string|null;face_id:string|null;material:string;work_type:string;started_at:string;ended_at:string|null;volume_m3:number;notes:string|null;status:string};
type Production={id:string;shift_id:string;block_id:string|null;face_id:string|null;material:string;volume_m3:number;measured_at:string;status:string};
type Haul={id:string;shift_id:string;equipment_id:string;material:string;source_face_id:string|null;destination_name:string;trip_count:number;departed_at:string;arrived_at:string|null;status:string};
type Maintenance={id:string;equipment_id:string;reported_at:string;fault_category:string;description:string;repair_started_at:string|null;repair_finished_at:string|null;returned_at:string|null;status:string};
type Plan={id:string;plan_date:string;shift_kind:string;area_id:string|null;block_id:string|null;material:string;planned_volume_m3:number};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const input:React.CSSProperties={background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'10px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const materialName=(v:string)=>v==='ore'?'Хүдэр':v==='waste'?'Хөрс':'Бусад';
const shiftName=(v:string)=>v==='day'?'Өдөр':'Шөнө';
const fmt=(v:string|null)=>v?new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)):'';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar'}).format(new Date());

export default function ReportsPage(){
 const db=useMemo(()=>createClient(),[]);
 const [shifts,setShifts]=useState<Shift[]>([]);const [equipment,setEquipment]=useState<Equipment[]>([]);const [employees,setEmployees]=useState<Employee[]>([]);const [areas,setAreas]=useState<Area[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [faces,setFaces]=useState<Face[]>([]);
 const [works,setWorks]=useState<Work[]>([]);const [production,setProduction]=useState<Production[]>([]);const [hauls,setHauls]=useState<Haul[]>([]);const [maintenance,setMaintenance]=useState<Maintenance[]>([]);const [plans,setPlans]=useState<Plan[]>([]);
 const [from,setFrom]=useState(()=>today().slice(0,8)+'01');const [to,setTo]=useState(today());const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [exporting,setExporting]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  const [s,e,emp,a,b,f,w,p,h,m,pl]=await Promise.all([
   db.from('shifts').select('id,shift_date,shift_kind').order('shift_date',{ascending:false}).limit(3000),
   db.from('equipment').select('id,equipment_code').order('equipment_code'),
   db.from('employees').select('id,full_name').order('full_name'),
   db.from('mine_areas').select('id,area_name').order('area_name'),
   db.from('mine_blocks').select('id,area_id,block_code').order('block_code'),
   db.from('mine_faces').select('id,block_id,face_code').order('face_code'),
   db.from('work_records').select('id,record_no,shift_id,equipment_id,operator_id,block_id,face_id,material,work_type,started_at,ended_at,volume_m3,notes,status').order('started_at',{ascending:false}).limit(5000),
   db.from('production_records').select('id,shift_id,block_id,face_id,material,volume_m3,measured_at,status').order('measured_at',{ascending:false}).limit(5000),
   db.from('haul_records').select('id,shift_id,equipment_id,material,source_face_id,destination_name,trip_count,departed_at,arrived_at,status').order('departed_at',{ascending:false}).limit(5000),
   db.from('maintenance_orders').select('id,equipment_id,reported_at,fault_category,description,repair_started_at,repair_finished_at,returned_at,status').order('reported_at',{ascending:false}).limit(5000),
   db.from('plan_records').select('id,plan_date,shift_kind,area_id,block_id,material,planned_volume_m3').order('plan_date',{ascending:false}).limit(5000)
  ]);
  const err=s.error||e.error||emp.error||a.error||b.error||f.error||w.error||p.error||h.error||m.error||pl.error;
  if(err)setError(err.message);else{setShifts((s.data||[]) as Shift[]);setEquipment((e.data||[]) as Equipment[]);setEmployees((emp.data||[]) as Employee[]);setAreas((a.data||[]) as Area[]);setBlocks((b.data||[]) as Block[]);setFaces((f.data||[]) as Face[]);setWorks((w.data||[]) as Work[]);setProduction((p.data||[]) as Production[]);setHauls((h.data||[]) as Haul[]);setMaintenance((m.data||[]) as Maintenance[]);setPlans((pl.data||[]) as Plan[]);}
  setLoading(false);
 },[db]);
 useEffect(()=>{void load();},[load]);
 const shiftMap=useMemo(()=>new Map(shifts.map(x=>[x.id,x])),[shifts]);const equipMap=useMemo(()=>new Map(equipment.map(x=>[x.id,x.equipment_code])),[equipment]);const empMap=useMemo(()=>new Map(employees.map(x=>[x.id,x.full_name])),[employees]);const areaMap=useMemo(()=>new Map(areas.map(x=>[x.id,x.area_name])),[areas]);const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);const faceMap=useMemo(()=>new Map(faces.map(x=>[x.id,x])),[faces]);
 const inRange=(d:string)=>d>=from&&d<=to;
 const workRows=works.filter(x=>inRange(x.started_at.slice(0,10)));
 const productionRows=production.filter(x=>inRange(x.measured_at.slice(0,10)));
 const haulRows=hauls.filter(x=>inRange(x.departed_at.slice(0,10)));
 const maintenanceRows=maintenance.filter(x=>inRange(x.reported_at.slice(0,10)));
 const planRows=plans.filter(x=>inRange(x.plan_date));
 const planActual=new Map<string,number>();for(const p of productionRows){const s=shiftMap.get(p.shift_id);if(!s||!p.block_id)continue;const k=[s.shift_date,s.shift_kind,p.block_id,p.material].join('|');planActual.set(k,(planActual.get(k)||0)+Number(p.volume_m3||0));}
 const totalVolume=productionRows.reduce((n,x)=>n+Number(x.volume_m3||0),0);const totalTrips=haulRows.reduce((n,x)=>n+Number(x.trip_count||0),0);
 const totalPlan=planRows.reduce((n,x)=>n+Number(x.planned_volume_m3||0),0);const totalPlanActual=planRows.reduce((n,x)=>{const k=[x.plan_date,x.shift_kind,x.block_id||'',x.material].join('|');return n+(planActual.get(k)||0);},0);
 const number=(v:number)=>Number(v||0).toLocaleString('mn-MN',{maximumFractionDigits:2});
 async function exportExcel(){setExporting(true);setError('');
  try{
   const wb=XLSX.utils.book_new();
   const shiftRows=shifts.filter(s=>inRange(s.shift_date)).map(s=>({Огноо:s.shift_date,Ээлж:shiftName(s.shift_kind),Эхлэх:fmt(s.id?null:null), 'Ээлжийн ID':s.id}));
   const workSheet=workRows.map(r=>{const s=shiftMap.get(r.shift_id);const face=r.face_id?faceMap.get(r.face_id):null;return {'Бүртгэлийн №':r.record_no,Огноо:s?.shift_date||r.started_at.slice(0,10),Ээлж:s?shiftName(s.shift_kind):'',Техник:equipMap.get(r.equipment_id||'')||'',Оператор:empMap.get(r.operator_id||'')||'',Блок:blockMap.get(r.block_id||'')||'',Мөргөцөг:face?.face_code||'',Материал:materialName(r.material),Ажлын_төрөл:r.work_type,Эхэлсэн:fmt(r.started_at),Дууссан:fmt(r.ended_at),Хэмжээ_м3:Number(r.volume_m3||0),Тайлбар:r.notes||'',Төлөв:r.status};});
   const productionSheet=productionRows.map(r=>{const s=shiftMap.get(r.shift_id);const face=r.face_id?faceMap.get(r.face_id):null;return {Огноо:s?.shift_date||r.measured_at.slice(0,10),Ээлж:s?shiftName(s.shift_kind):'',Блок:blockMap.get(r.block_id||'')||'',Мөргөцөг:face?.face_code||'',Материал:materialName(r.material),Хэмжээ_м3:Number(r.volume_m3||0),Бүртгэсэн_цаг:fmt(r.measured_at),Төлөв:r.status};});
   const haulSheet=haulRows.map(r=>{const s=shiftMap.get(r.shift_id);const face=r.source_face_id?faceMap.get(r.source_face_id):null;return {Огноо:s?.shift_date||r.departed_at.slice(0,10),Ээлж:s?shiftName(s.shift_kind):'',Техник:equipMap.get(r.equipment_id)||'',Материал:materialName(r.material),Ачилтын_мөргөцөг:face?.face_code||'',Буулгах_цэг:r.destination_name,Рейс:Number(r.trip_count),Гарсан_цаг:fmt(r.departed_at),Ирсэн_цаг:fmt(r.arrived_at),Төлөв:r.status};});
   const maintenanceSheet=maintenanceRows.map(r=>({Техник:equipMap.get(r.equipment_id)||'',Мэдээлсэн:fmt(r.reported_at),Эвдрэлийн_төрөл:r.fault_category,Тайлбар:r.description,Засвар_эхэлсэн:fmt(r.repair_started_at),Засвар_дууссан:fmt(r.repair_finished_at),Ашиглалтад_буцаасан:fmt(r.returned_at),Төлөв:r.status}));
   const planSheet=planRows.map(r=>{const actual=planActual.get([r.plan_date,r.shift_kind,r.block_id||'',r.material].join('|'))||0;return {Огноо:r.plan_date,Ээлж:shiftName(r.shift_kind),Талбай:areaMap.get(r.area_id||'')||'',Блок:blockMap.get(r.block_id||'')||'',Материал:materialName(r.material),Төлөвлөсөн_м3:Number(r.planned_volume_m3),Бодит_м3:actual,Зөрүү_м3:Number(r.planned_volume_m3)-actual,Биелэлт_хувь:Number(r.planned_volume_m3)>0?Number((actual/Number(r.planned_volume_m3)*100).toFixed(1)):0};});
   const summary=[{Үзүүлэлт:'Олборлолт',Нийт:totalVolume,Нэгж:'м³'},{Үзүүлэлт:'Тээвэрлэлт',Нийт:totalTrips,Нэгж:'рейс'},{Үзүүлэлт:'Төлөвлөгөө',Нийт:totalPlan,Нэгж:'м³'},{Үзүүлэлт:'Төлөвлөгөөний бодит гүйцэтгэл',Нийт:totalPlanActual,Нэгж:'м³'},{Үзүүлэлт:'Төлөвлөгөөний биелэлт',Нийт:totalPlan?Number((totalPlanActual/totalPlan*100).toFixed(1)):0,Нэгж:'%'},{Үзүүлэлт:'Уулын ажлын бүртгэл',Нийт:workRows.length,Нэгж:'бүртгэл'},{Үзүүлэлт:'Засварын бүртгэл',Нийт:maintenanceRows.length,Нэгж:'бүртгэл'}];
   const add=(name:string,rows:object[])=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{Мэдээлэл:'Сонгосон хугацаанд бүртгэл алга'}]);ws['!cols']=Object.keys(rows[0]||{Мэдээлэл:''}).map(k=>({wch:Math.min(32,Math.max(14,k.length+4))}));XLSX.utils.book_append_sheet(wb,ws,name);};
   add('Тойм',summary);add('Ээлж',shiftRows);add('Уулын ажил',workSheet);add('Олборлолт',productionSheet);add('Тээвэрлэлт',haulSheet);add('Засвар',maintenanceSheet);add('Төлөвлөгөө',planSheet);
   XLSX.writeFile(wb,'MINE_CONTROL_Tailan_'+from+'_to_'+to+'.xlsx');
  }catch(e){setError(e instanceof Error?e.message:'Excel файл үүсгэхэд алдаа гарлаа.');}
  setExporting(false);
 }
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
  <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
  <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>УДИРДЛАГА · ТАЙЛАН</div><h1 style={{fontSize:28,margin:'8px 0'}}>Тайлан, Excel</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Сонгосон хугацааны уурхайн бүртгэлийг нэг Excel файлд олон sheet болгон татна.</p></div>
  {error&&<div role="alert" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid #7f3434',background:'#351b1b',color:'#ffb5a8',fontSize:13}}>{error}</div>}
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 14px'}}>Тайлангийн хугацаа</h2><div style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap'}}>
   <label style={{...label,minWidth:180}}>Эхлэх огноо<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} style={input}/></label>
   <label style={{...label,minWidth:180}}>Дуусах огноо<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} style={input}/></label>
   <button onClick={()=>void load()} disabled={loading} style={{border:'1px solid #303939',borderRadius:9,padding:'10px 14px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={15} style={{verticalAlign:'middle'}}/> Шинэчлэх</button>
   <button onClick={()=>void exportExcel()} disabled={loading||exporting} style={{border:0,borderRadius:9,padding:'11px 16px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'}}><Download size={16} style={{verticalAlign:'middle'}}/> {exporting?'Бэлтгэж байна...':'Excel татах'}</button>
  </div></section>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:18}}>
   {[['Олборлолт',number(totalVolume),'м³'],['Тээвэрлэлт',number(totalTrips),'рейс'],['Төлөвлөгөө',number(totalPlan),'м³'],['Төлөвлөгөөний биелэлт',totalPlan?((totalPlanActual/totalPlan)*100).toFixed(1)+'%':'0.0%','']].map(([title,value,unit])=><section key={title} style={{...panel,marginBottom:0}}><div style={{color:'#9aa6a1',fontSize:12}}>{title}</div><b style={{fontSize:24,color:'#f4c62f'}}>{value} <small style={{fontSize:12,color:'#9aa6a1'}}>{unit}</small></b></section>)}
  </div>
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 12px'}}>Экспортод орох мэдээлэл</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,color:'#c4cfca',fontSize:13}}>
   {['Тойм үзүүлэлт','Ээлжийн бүртгэл','Уулын ажлын бүртгэл','Олборлолтын бүртгэл','Тээвэрлэлтийн бүртгэл','Засвар үйлчилгээ','Төлөвлөгөө ба бодит гүйцэтгэл'].map(x=><div key={x} style={{display:'flex',gap:8,alignItems:'center'}}><FileSpreadsheet size={16} color="#f4c62f"/>{x}</div>)}
  </div><p style={{color:'#899393',fontSize:12,marginBottom:0}}>Excel файл нь тус бүрдээ салангид 7 worksheet-тэй. Хэмжээ м³, тээвэрлэлт рейсээр гарна.</p></section>
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 12px'}}>Сонгосон хугацааны мэдээлэл</h2>{loading?<p style={{color:'#899393'}}>Өгөгдөл уншиж байна...</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,color:'#c4cfca',fontSize:13}}><div>Уулын ажил: <b>{workRows.length}</b></div><div>Олборлолт: <b>{productionRows.length}</b></div><div>Тээвэрлэлт: <b>{haulRows.length}</b></div><div>Засвар: <b>{maintenanceRows.length}</b></div><div>Төлөвлөгөө: <b>{planRows.length}</b></div></div>}</section>
 </div></main>;
}
