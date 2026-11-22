'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mountain, Plus, RefreshCw, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Shift={id:string;shift_date:string;shift_kind:'day'|'night';starts_at:string;ends_at:string;status:string};
type Equipment={id:string;equipment_code:string};
type Employee={id:string;full_name:string};
type Area={id:string;area_name:string};
type Block={id:string;area_id:string;block_code:string;level_name:string|null};
type Face={id:string;block_id:string;face_code:string;material:'ore'|'waste'|'other'};
type Work={id:string;record_no:number;shift_id:string;equipment_id:string|null;block_id:string|null;face_id:string|null;material:'ore'|'waste'|'other';work_type:string;started_at:string;ended_at:string|null;volume_m3:number;operator_id:string|null;notes:string|null;status:string};

const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const localInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
const toMongoliaIso=(v:string)=>v?new Date(v+':00+08:00').toISOString():null;
const showTime=(v:string|null)=>v?new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)):'—';

export default function WorkRecordsPage(){
 const [shifts,setShifts]=useState<Shift[]>([]);const [equipment,setEquipment]=useState<Equipment[]>([]);const [employees,setEmployees]=useState<Employee[]>([]);const [areas,setAreas]=useState<Area[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [faces,setFaces]=useState<Face[]>([]);const [records,setRecords]=useState<Work[]>([]);
 const [shiftId,setShiftId]=useState('');const [equipmentId,setEquipmentId]=useState('');const [blockId,setBlockId]=useState('');const [faceId,setFaceId]=useState('');const [material,setMaterial]=useState<'ore'|'waste'|'other'>('ore');const [workType,setWorkType]=useState('Хүдэр олборлолт');const [started,setStarted]=useState(()=>localInput(new Date()));const [ended,setEnded]=useState('');const [volume,setVolume]=useState('0');const [operatorId,setOperatorId]=useState('');const [notes,setNotes]=useState('');
 const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');const db=createClient();if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
 const [s,e,emp,a,b,f,w]=await Promise.all([
 db.from('shifts').select('id,shift_date,shift_kind,starts_at,ends_at,status').order('shift_date',{ascending:false}).limit(100),
 db.from('equipment').select('id,equipment_code').eq('is_active',true).order('equipment_code'),
 db.from('employees').select('id,full_name').eq('is_active',true).order('full_name'),
 db.from('mine_areas').select('id,area_name').eq('is_active',true).order('area_name'),
 db.from('mine_blocks').select('id,area_id,block_code,level_name').eq('is_active',true).order('block_code'),
 db.from('mine_faces').select('id,block_id,face_code,material').eq('is_active',true).order('face_code'),
 db.from('work_records').select('id,record_no,shift_id,equipment_id,block_id,face_id,material,work_type,started_at,ended_at,volume_m3,operator_id,notes,status').order('started_at',{ascending:false}).limit(200)
 ]);
 const err=s.error||e.error||emp.error||a.error||b.error||f.error||w.error;if(err)setError(err.message);else{
 setShifts((s.data||[]) as Shift[]);setEquipment((e.data||[]) as Equipment[]);setEmployees((emp.data||[]) as Employee[]);setAreas((a.data||[]) as Area[]);setBlocks((b.data||[]) as Block[]);setFaces((f.data||[]) as Face[]);setRecords((w.data||[]) as Work[]);
 if(!shiftId&&s.data?.[0])setShiftId(s.data[0].id);
 }
 setLoading(false);
 },[shiftId]);
 useEffect(()=>{void load();},[load]);
 const areaMap=useMemo(()=>new Map(areas.map(x=>[x.id,x.area_name])),[areas]);
 const equipmentMap=useMemo(()=>new Map(equipment.map(x=>[x.id,x.equipment_code])),[equipment]);
 const employeeMap=useMemo(()=>new Map(employees.map(x=>[x.id,x.full_name])),[employees]);
 const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);
 const filtered=records.filter(r=>[String(r.record_no),r.work_type,blockMap.get(r.block_id||''),equipmentMap.get(r.equipment_id||''),employeeMap.get(r.operator_id||'')].some(v=>(v||'').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');if(ended&&new Date(ended)<=new Date(started)){setError('Дууссан цаг эхэлсэн цагаас хойш байх ёстой.');setSaving(false);return;}
 const db=createClient();if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}const {data:{user}}=await db.auth.getUser();
 const {error:err}=await db.from('work_records').insert({shift_id:shiftId,equipment_id:equipmentId||null,block_id:blockId||null,face_id:faceId||null,material,work_type:workType.trim(),started_at:toMongoliaIso(started),ended_at:toMongoliaIso(ended),volume_m3:Number(volume),operator_id:operatorId||null,notes:notes.trim()||null,created_by:user?.id||null,updated_by:user?.id||null});
 if(err)setError(err.message);else{setNotice('Уулын ажлын бүртгэл хадгалагдлаа.');setVolume('0');setEnded('');setNotes('');await load();}setSaving(false);
 }
 const btn:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
 <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
 <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>ҮЙЛ АЖИЛЛАГААНЫ БҮРТГЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Уулын ажлын бүртгэл</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Ээлж, техник, оператор, байршил болон ажилласан хугацааг бүртгэнэ.</p></div>
 {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
 <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ ажил бүртгэх</h2>
 <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13,alignItems:'end'}}>
 <label style={label}>Ээлж<select required value={shiftId} onChange={e=>setShiftId(e.target.value)} style={input}><option value="">Ээлж сонгох</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.shift_date} · {s.shift_kind==='day'?'Өдөр':'Шөнө'} ({s.status})</option>)}</select></label>
 <label style={label}>Техник<select value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.equipment_code}</option>)}</select></label>
 <label style={label}>Оператор<select value={operatorId} onChange={e=>setOperatorId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{employees.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>
 <label style={label}>Талбай / блок<select value={blockId} onChange={e=>{setBlockId(e.target.value);setFaceId('');}} style={input}><option value="">Блок сонгох</option>{blocks.map(x=><option key={x.id} value={x.id}>{areaMap.get(x.area_id)||'Талбай'} · {x.block_code}{x.level_name?' · '+x.level_name:''}</option>)}</select></label>
 <label style={label}>Мөргөцөг<select value={faceId} onChange={e=>setFaceId(e.target.value)} style={input}><option value="">Сонгоогүй</option>{faces.filter(x=>!blockId||x.block_id===blockId).map(x=><option key={x.id} value={x.id}>{blockMap.get(x.block_id)} · {x.face_code}</option>)}</select></label>
 <label style={label}>Материал<select value={material} onChange={e=>setMaterial(e.target.value as 'ore'|'waste'|'other')} style={input}><option value="ore">Хүдэр</option><option value="waste">Хөрс</option><option value="other">Бусад</option></select></label>
 <label style={label}>Ажлын төрөл<input required value={workType} onChange={e=>setWorkType(e.target.value)} style={input} list="work-types"/><datalist id="work-types">{['Хүдэр олборлолт','Хөрс хуулалт','Тэсэлгээнээс гаргах шилжилт','Тэсэлгээний улмаас зогссон','Тэсэлгээнээс оруулах шилжилт','Мөргөцөг хооронд шилжилт','Нөөцөнд зогссон','Түлш авах','Ус авах','Ул түрэлт','Гадны ажил','Бусад ажил'].map(x=><option key={x} value={x}/>)}</datalist></label>
 <label style={label}>Эхэлсэн цаг<input required type="datetime-local" value={started} onChange={e=>setStarted(e.target.value)} style={input}/></label>
 <label style={label}>Дууссан цаг<input type="datetime-local" value={ended} onChange={e=>setEnded(e.target.value)} style={input}/></label>
 <label style={label}>Хэмжээ (м³)<input required type="number" min="0" step="0.01" value={volume} onChange={e=>setVolume(e.target.value)} style={input}/></label>
 <label style={{...label,gridColumn:'span 2'}}>Тайлбар<input value={notes} onChange={e=>setNotes(e.target.value)} style={input} placeholder="Нэмэлт тэмдэглэл"/></label>
 <button disabled={saving||!shifts.length} style={btn}><Plus size={15} style={{verticalAlign:'middle'}}/> Бүртгэл хадгалах</button>
 </form>
 {shifts.length===0&&!loading&&<p style={{color:'#e2bd64',fontSize:12,marginBottom:0}}>Эхлээд Ээлжийн бүртгэлээс ээлж үүсгэнэ үү.</p>}
 </section>
 <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Сүүлийн уулын ажлын бүртгэл</h2><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1010',border:'1px solid #303939',borderRadius:9,padding:'0 10px'}}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Бүртгэл, техник, оператор..." style={{...input,border:0,width:220,padding:'10px 0'}}/></div><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div></div>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:1050}}><thead><tr>{['№','ЭЭЛЖ','ТЕХНИК','ОПЕРАТОР','БЛОК / МӨРГӨЦӨГ','АЖЛЫН ТӨРӨЛ','ЭХЭЛСЭН','ДУУССАН','ХЭМЖЭЭ М³','ТӨЛӨВ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:10,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
 {loading?<tr><td colSpan={10} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:filtered.length===0?<tr><td colSpan={10} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор уулын ажлын бүртгэл алга.</td></tr>:filtered.map(r=><tr key={r.id}><td style={{padding:11,borderBottom:'1px solid #202828',color:'#f4c62f'}}>{r.record_no}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{shifts.find(s=>s.id===r.shift_id)?.shift_date||'—'} · {shifts.find(s=>s.id===r.shift_id)?.shift_kind==='day'?'Өдөр':'Шөнө'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{equipmentMap.get(r.equipment_id||'')||'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{employeeMap.get(r.operator_id||'')||'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{blockMap.get(r.block_id||'')||'—'}{r.face_id?' / '+(faces.find(f=>f.id===r.face_id)?.face_code||''):''}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.work_type}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.started_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828',whiteSpace:'nowrap'}}>{showTime(r.ended_at)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{Number(r.volume_m3).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.status==='draft'?'Ноорог':r.status==='submitted'?'Илгээсэн':r.status==='approved'?'Баталсан':'Хүчингүй'}</td></tr>)}
 </tbody></table></div></section>
 </div></main>;
}
