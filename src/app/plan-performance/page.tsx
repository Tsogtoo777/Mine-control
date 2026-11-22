'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Activity, Plus, RefreshCw, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Area={id:string;area_name:string};
type Block={id:string;area_id:string;block_code:string};
type Shift={id:string;shift_date:string;shift_kind:'day'|'night'};
type Plan={id:string;plan_date:string;shift_kind:'day'|'night';area_id:string|null;block_id:string|null;material:'ore'|'waste'|'other';planned_volume_m3:number;created_at:string};
type Production={id:string;shift_id:string;block_id:string|null;material:'ore'|'waste'|'other';volume_m3:number;status:string};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:9,padding:'11px 12px'};
const label:React.CSSProperties={display:'grid',gap:7,color:'#aeb9b6',fontSize:12};
const panel:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:20,marginBottom:18};
const today=()=>{const d=new Date(Date.now()+8*60*60*1000);return d.toISOString().slice(0,10);};
const materialName=(m:string)=>m==='ore'?'Хүдэр':m==='waste'?'Хөрс':'Бусад';
const shiftName=(s:string)=>s==='day'?'Өдөр':'Шөнө';

export default function PlanPerformancePage(){
 const db=useMemo(()=>createClient(),[]);
 const [areas,setAreas]=useState<Area[]>([]);const [blocks,setBlocks]=useState<Block[]>([]);const [shifts,setShifts]=useState<Shift[]>([]);
 const [plans,setPlans]=useState<Plan[]>([]);const [production,setProduction]=useState<Production[]>([]);
 const [planDate,setPlanDate]=useState(today);const [shiftKind,setShiftKind]=useState<'day'|'night'>('day');const [areaId,setAreaId]=useState('');const [blockId,setBlockId]=useState('');const [material,setMaterial]=useState<'ore'|'waste'|'other'>('ore');const [volume,setVolume]=useState('');const [search,setSearch]=useState('');
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
  const [a,b,s,p,r]=await Promise.all([
   db.from('mine_areas').select('id,area_name').eq('is_active',true).order('area_name'),
   db.from('mine_blocks').select('id,area_id,block_code').eq('is_active',true).order('block_code'),
   db.from('shifts').select('id,shift_date,shift_kind').order('shift_date',{ascending:false}).limit(500),
   db.from('plan_records').select('id,plan_date,shift_kind,area_id,block_id,material,planned_volume_m3,created_at').order('plan_date',{ascending:false}).limit(500),
   db.from('production_records').select('id,shift_id,block_id,material,volume_m3,status').neq('status','voided').limit(2000)
  ]);
  const err=a.error||b.error||s.error||p.error||r.error;if(err)setError(err.message);else{setAreas((a.data||[]) as Area[]);setBlocks((b.data||[]) as Block[]);setShifts((s.data||[]) as Shift[]);setPlans((p.data||[]) as Plan[]);setProduction((r.data||[]) as Production[]);if(!areaId&&a.data?.[0])setAreaId(a.data[0].id);}
  setLoading(false);
 },[db,areaId]);
 useEffect(()=>{void load();},[load]);
 const areaMap=useMemo(()=>new Map(areas.map(x=>[x.id,x.area_name])),[areas]);const blockMap=useMemo(()=>new Map(blocks.map(x=>[x.id,x.block_code])),[blocks]);const shiftMap=useMemo(()=>new Map(shifts.map(x=>[x.id,x])),[shifts]);
 const actualByKey=useMemo(()=>{const m=new Map<string,number>();for(const r of production){const s=shiftMap.get(r.shift_id);if(!s||!r.block_id)continue;const k=[s.shift_date,s.shift_kind,r.block_id,r.material].join('|');m.set(k,(m.get(k)||0)+Number(r.volume_m3||0));}return m;},[production,shiftMap]);
 const rows=useMemo(()=>plans.map(p=>{const key=[p.plan_date,p.shift_kind,p.block_id||'',p.material].join('|');const actual=actualByKey.get(key)||0;const planned=Number(p.planned_volume_m3);return {...p,actual,remaining:planned-actual,percent:planned>0?actual/planned*100:0};}),[plans,actualByKey]);
 const filtered=rows.filter(r=>[r.plan_date,shiftName(r.shift_kind),blockMap.get(r.block_id||''),areaMap.get(r.area_id||''),materialName(r.material)].some(v=>(v||'').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 const totalPlan=rows.reduce((n,r)=>n+Number(r.planned_volume_m3),0);const totalActual=rows.reduce((n,r)=>n+r.actual,0);const percent=totalPlan?totalActual/totalPlan*100:0;
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}if(Number(volume)<=0){setError('Төлөвлөсөн хэмжээ 0-ээс их байх ёстой.');setSaving(false);return;}
  const {data:{user}}=await db.auth.getUser();
  const {error:err}=await db.from('plan_records').insert({plan_date:planDate,shift_kind:shiftKind,area_id:areaId||null,block_id:blockId||null,material,planned_volume_m3:Number(volume),created_by:user?.id||null});
  if(err)setError(err.message);else{setNotice('Төлөвлөгөө амжилттай хадгалагдлаа.');setVolume('');await load();}setSaving(false);
 }
 const btn:React.CSSProperties={border:0,borderRadius:9,padding:'10px 15px',background:'#f4c62f',color:'#171717',fontWeight:800,cursor:'pointer'};
 const kpi:React.CSSProperties={...panel,marginBottom:0};
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:24}}><div style={{maxWidth:1250,margin:'0 auto'}}>
  <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:18}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
  <div style={{marginBottom:24}}><div style={{color:'#f4c62f',fontSize:11,fontWeight:800,letterSpacing:1.5}}>УДИРДЛАГА · ҮЙЛДВЭРЛЭЛ</div><h1 style={{fontSize:28,margin:'8px 0'}}>Төлөвлөгөө, гүйцэтгэл</h1><p style={{color:'#899393',fontSize:13,margin:0}}>Ээлж, блок, материал тус бүрийн төлөвлөгөөг бодит олборлолттой харьцуулна.</p></div>
  {(error||notice)&&<div role="status" style={{marginBottom:16,padding:12,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginBottom:18}}>
   <section style={kpi}><div style={{color:'#9aa6a1',fontSize:12}}>Нийт төлөвлөгөө</div><b style={{fontSize:25}}>{totalPlan.toLocaleString('mn-MN')} <small style={{fontSize:12,color:'#9aa6a1'}}>м³</small></b></section>
   <section style={kpi}><div style={{color:'#9aa6a1',fontSize:12}}>Бодит гүйцэтгэл</div><b style={{fontSize:25,color:'#f4c62f'}}>{totalActual.toLocaleString('mn-MN')} <small style={{fontSize:12,color:'#9aa6a1'}}>м³</small></b></section>
   <section style={kpi}><div style={{color:'#9aa6a1',fontSize:12}}>Биелэлт</div><b style={{fontSize:25,color:percent>=100?'#8cdaa7':'#f4c62f'}}>{percent.toFixed(1)}%</b><div style={{height:6,background:'#283131',borderRadius:9,marginTop:10,overflow:'hidden'}}><div style={{height:'100%',width:Math.min(percent,100)+'%',background:'#f4c62f'}}/></div></section>
  </div>
  <section style={panel}><h2 style={{fontSize:16,margin:'0 0 16px'}}>Шинэ төлөвлөгөө бүртгэх</h2>
   <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:13,alignItems:'end'}}>
    <label style={label}>Огноо<input required type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} style={input}/></label>
    <label style={label}>Ээлж<select value={shiftKind} onChange={e=>setShiftKind(e.target.value as 'day'|'night')} style={input}><option value="day">Өдөр</option><option value="night">Шөнө</option></select></label>
    <label style={label}>Уурхайн талбай<select value={areaId} onChange={e=>{setAreaId(e.target.value);setBlockId('');}} style={input}><option value="">Сонгоогүй</option>{areas.map(a=><option key={a.id} value={a.id}>{a.area_name}</option>)}</select></label>
    <label style={label}>Блок<select value={blockId} onChange={e=>setBlockId(e.target.value)} style={input}><option value="">Блок сонгох</option>{blocks.filter(b=>!areaId||b.area_id===areaId).map(b=><option key={b.id} value={b.id}>{areaMap.get(b.area_id)||'Талбай'} · {b.block_code}</option>)}</select></label>
    <label style={label}>Материал<select value={material} onChange={e=>setMaterial(e.target.value as 'ore'|'waste'|'other')} style={input}><option value="ore">Хүдэр</option><option value="waste">Хөрс</option><option value="other">Бусад</option></select></label>
    <label style={label}>Төлөвлөсөн хэмжээ (м³)<input required type="number" min="0.01" step="0.01" value={volume} onChange={e=>setVolume(e.target.value)} style={input} placeholder="Жишээ: 15000"/></label>
    <button disabled={saving} style={btn}><Plus size={15} style={{verticalAlign:'middle'}}/> Төлөвлөгөө хадгалах</button>
   </form>
  </section>
  <section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:16,margin:0}}>Төлөвлөгөөний биелэлт</h2><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1010',border:'1px solid #303939',borderRadius:9,padding:'0 10px'}}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Огноо, талбай, блок..." style={{...input,border:0,width:220,padding:'10px 0'}}/></div><button onClick={()=>void load()} style={{border:'1px solid #303939',borderRadius:9,padding:'9px 11px',background:'#171e1e',color:'#dce3df',cursor:'pointer'}}><RefreshCw size={16}/></button></div></div>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:950}}><thead><tr>{['ОГНОО','ЭЭЛЖ','ТАЛБАЙ / БЛОК','МАТЕРИАЛ','ТӨЛӨВЛӨСӨН М³','БОДИТ М³','ЗӨРҮҮ М³','БИЕЛЭЛТ'].map(h=><th key={h} style={{textAlign:'left',color:'#7d8986',fontSize:10,padding:10,borderBottom:'1px solid #293131'}}>{h}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={8} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr>:filtered.length===0?<tr><td colSpan={8} style={{padding:28,textAlign:'center',color:'#899393'}}>Төлөвлөгөөний бүртгэл алга.</td></tr>:filtered.map(r=><tr key={r.id}><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.plan_date}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{shiftName(r.shift_kind)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{areaMap.get(r.area_id||'')||'—'} / {blockMap.get(r.block_id||'')||'—'}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{materialName(r.material)}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{Number(r.planned_volume_m3).toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828'}}>{r.actual.toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828',color:r.remaining<0?'#e7a39a':'#aeb9b6'}}>{r.remaining.toLocaleString('mn-MN')}</td><td style={{padding:11,borderBottom:'1px solid #202828',minWidth:125}}><b style={{color:r.percent>=100?'#8cdaa7':'#f4c62f'}}>{r.percent.toFixed(1)}%</b><div style={{height:5,background:'#283131',borderRadius:8,marginTop:6,overflow:'hidden'}}><div style={{height:'100%',width:Math.min(r.percent,100)+'%',background:r.percent>=100?'#72bd8b':'#f4c62f'}}/></div></td></tr>)}
   </tbody></table></div>
  </section>
 </div></main>;
}
