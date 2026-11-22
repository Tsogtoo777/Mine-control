'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Check, ChevronDown, Eraser, Map as MapIcon, MousePointer2, RefreshCw, Undo2 } from 'lucide-react';

type Point={x:number;y:number};
type Shape={type:'Polygon';points:Point[]};
type Block={id:string;area_id:string;block_code:string;level_name:string|null;geometry_json:unknown;is_active:boolean};
type Face={id:string;block_id:string;face_code:string;material:'ore'|'waste'|'other';geometry_json:unknown;is_active:boolean};
type Area={id:string;area_code:string;area_name:string};
const box:React.CSSProperties={background:'#111515',border:'1px solid #252d2d',borderRadius:14,padding:18};
const field:React.CSSProperties={width:'100%',background:'#0b1010',color:'#f5f5f0',border:'1px solid #303939',borderRadius:8,padding:'10px 12px'};
const asShape=(value:unknown):Shape|null=>{if(!value||typeof value!=='object')return null;const v=value as Partial<Shape>;if(v.type!=='Polygon'||!Array.isArray(v.points))return null;const points=v.points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));return points.length>=3?{type:'Polygon',points}:null;};
const pointsAttr=(points:Point[])=>points.map(p=>p.x+','+p.y).join(' ');
export default function MineMapPage(){
 const [blocks,setBlocks]=useState<Block[]>([]),[faces,setFaces]=useState<Face[]>([]),[areas,setAreas]=useState<Area[]>([]);
 const [mode,setMode]=useState<'block'|'face'>('block'),[selected,setSelected]=useState(''),[draft,setDraft]=useState<Point[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');const db=createClient();if(!db){setError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
 const [b,f,a]=await Promise.all([db.from('mine_blocks').select('id,area_id,block_code,level_name,geometry_json,is_active').order('block_code'),db.from('mine_faces').select('id,block_id,face_code,material,geometry_json,is_active').order('face_code'),db.from('mine_areas').select('id,area_code,area_name').order('area_code')]);
 const err=b.error||f.error||a.error;if(err)setError(err.message);else{setBlocks((b.data||[]) as Block[]);setFaces((f.data||[]) as Face[]);setAreas((a.data||[]) as Area[]);}setLoading(false);},[]);
 useEffect(()=>{void load();},[load]);
 const blockById=useMemo(()=>new Map(blocks.map(b=>[b.id,b])),[blocks]);
 const areaById=useMemo(()=>new Map(areas.map(a=>[a.id,a])),[areas]);
 const faceLabel=(f:Face)=>{const b=blockById.get(f.block_id);return (b?.block_code||'Блок')+' / '+f.face_code;};
 const options=mode==='block'?blocks.filter(b=>b.is_active).map(b=>({id:b.id,label:(areaById.get(b.area_id)?.area_code||'Талбай')+' / '+b.block_code})):faces.filter(f=>f.is_active).map(f=>({id:f.id,label:faceLabel(f)}));
 useEffect(()=>{if(!options.some(o=>o.id===selected))setSelected(options[0]?.id||'');},[mode,blocks,faces,areas,selected]);
 function addPoint(e:React.MouseEvent<SVGSVGElement>){const rect=e.currentTarget.getBoundingClientRect();setDraft(prev=>[...prev,{x:Math.max(0,Math.min(1000,Math.round((e.clientX-rect.left)/rect.width*1000))),y:Math.max(0,Math.min(650,Math.round((e.clientY-rect.top)/rect.height*650)))}]);}
 async function save(){if(!selected||draft.length<3){setError('Зураглал хадгалахын тулд дор хаяж 3 цэг тэмдэглэнэ үү.');return;}setSaving(true);setError('');setNotice('');const db=createClient();if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}
 const table=mode==='block'?'mine_blocks':'mine_faces';const {error:e}=await db.from(table).update({geometry_json:{type:'Polygon',points:draft}}).eq('id',selected);
 if(e)setError(e.message);else{setNotice('2D зураглал амжилттай хадгалагдлаа.');setDraft([]);await load();}setSaving(false);}
 async function clearShape(){if(!selected)return;setSaving(true);setError('');const db=createClient();if(!db){setError('Supabase тохиргоо олдсонгүй.');setSaving(false);return;}const table=mode==='block'?'mine_blocks':'mine_faces';const {error:e}=await db.from(table).update({geometry_json:null}).eq('id',selected);if(e)setError(e.message);else{setNotice('Сонгосон дүрсийг арилгалаа.');setDraft([]);await load();}setSaving(false);}
 const currentShape=mode==='block'?asShape(blocks.find(b=>b.id===selected)?.geometry_json):asShape(faces.find(f=>f.id===selected)?.geometry_json);
 const mappedBlocks=blocks.filter(b=>b.is_active&&asShape(b.geometry_json));
 const mappedFaces=faces.filter(f=>f.is_active&&asShape(f.geometry_json));
 return <main style={{minHeight:'100vh',background:'#090b0b',color:'#f5f5f0',padding:22}}><div style={{maxWidth:1400,margin:'0 auto'}}>
 <a href="/" style={{color:'#f4c62f',textDecoration:'none',display:'inline-flex',gap:7,alignItems:'center',fontSize:13,marginBottom:16}}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
 <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap',marginBottom:18}}><div><div style={{fontSize:11,color:'#f4c62f',fontWeight:800,letterSpacing:1.4}}>УУРХАЙН БАЙРШИЛ · 2D</div><h1 style={{fontSize:28,margin:'7px 0'}}>Уурхайн зураглал</h1><p style={{margin:0,color:'#899393',fontSize:13}}>Блок, мөргөцгийн хил заагийг зураг дээр цэглэж хадгална.</p></div><button onClick={()=>void load()} style={{...field,width:'auto',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}><RefreshCw size={15}/> Шинэчлэх</button></header>
 {(error||notice)&&<div role="status" style={{padding:12,marginBottom:14,borderRadius:9,border:'1px solid '+(error?'#7f3434':'#376447'),background:error?'#351b1b':'#14251b',color:error?'#ffb5a8':'#a8e6bd',fontSize:13}}>{error||notice}</div>}
 <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 300px',gap:16,alignItems:'start'}}>
 <section style={box}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:12}}><div style={{display:'flex',gap:8,alignItems:'center',color:'#c4cfca',fontSize:12}}><MapIcon size={16} color="#f4c62f"/> Зураглалын талбар <span style={{color:'#74807c'}}>· {mappedBlocks.length} блок · {mappedFaces.length} мөргөцөг</span></div><div style={{display:'flex',gap:12,fontSize:11,color:'#aeb9b6'}}><span>🟨 Блок</span><span>🟦 Хүдэр</span><span>🟥 Хөрс</span></div></div>
  <div style={{border:'1px solid #34403d',borderRadius:10,overflow:'hidden',background:'#101918'}}>
   <svg viewBox="0 0 1000 650" preserveAspectRatio="none" onClick={addPoint} role="img" aria-label="Уурхайн зураглал дээр дарж цэг нэмэх" style={{display:'block',width:'100%',height:'min(68vh,680px)',minHeight:380,cursor:'crosshair',touchAction:'manipulation'}}>
    <defs><pattern id="mine-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#263532" strokeWidth="1"/></pattern></defs>
    <rect width="1000" height="650" fill="url(#mine-grid)"/>
    {mappedBlocks.map(b=>{const s=asShape(b.geometry_json)!;return <g key={b.id}><polygon points={pointsAttr(s.points)} fill="#e5b92e" fillOpacity=".12" stroke="#e5b92e" strokeWidth="3"/><text x={s.points.reduce((n,p)=>n+p.x,0)/s.points.length} y={s.points.reduce((n,p)=>n+p.y,0)/s.points.length} fill="#f4d36b" fontSize="20" textAnchor="middle">{b.block_code}</text></g>;})}
    {mappedFaces.map(f=>{const s=asShape(f.geometry_json)!;const fill=f.material==='ore'?'#4b9bd1':f.material==='waste'?'#c75b50':'#8b9b93';return <polygon key={f.id} points={pointsAttr(s.points)} fill={fill} fillOpacity=".3" stroke={fill} strokeWidth="2"/>;})}
    {currentShape&&<polygon points={pointsAttr(currentShape.points)} fill="#f4c62f" fillOpacity=".05" stroke="#f4c62f" strokeDasharray="7 6" strokeWidth="2"/>}
    {draft.length>0&&<><polyline points={pointsAttr(draft)} fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="7 5"/>{draft.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="7" fill="#f4c62f" stroke="#111" strokeWidth="2"/><text x={p.x+10} y={p.y-10} fill="#f5f5f0" fontSize="15">{i+1}</text></g>)}</>}
    {draft.length>=3&&<polygon points={pointsAttr(draft)} fill="#f4c62f" fillOpacity=".13" stroke="#f4c62f" strokeWidth="2"/>}
    {loading&&<text x="500" y="325" textAnchor="middle" fill="#aeb9b6" fontSize="22">Уншиж байна...</text>}
    {!loading&&mappedBlocks.length===0&&mappedFaces.length===0&&draft.length===0&&<text x="500" y="325" textAnchor="middle" fill="#7d8986" fontSize="22">Энд дарж блокийн хил заагийг зурна уу</text>}
   </svg>
  </div>
  <p style={{color:'#7d8986',fontSize:11,margin:'10px 0 0'}}>Зураг дээр дарж цэг нэмнэ. Дор хаяж 3 цэгээр хаалттай талбай үүсгээд хадгална. Одоогоор координат нь зураглалын дотоод харьцангуй нэгжээр хадгалагдана.</p>
 </section>
 <aside style={{display:'grid',gap:14}}>
  <section style={box}><h2 style={{fontSize:15,margin:'0 0 14px'}}>Зураглал үүсгэх</h2>
   <label style={{display:'grid',gap:7,fontSize:12,color:'#aeb9b6',marginBottom:12}}>Объектын төрөл<select style={field} value={mode} onChange={e=>{setMode(e.target.value as 'block'|'face');setDraft([]);}}><option value="block">Блок</option><option value="face">Мөргөцөг</option></select></label>
   <label style={{display:'grid',gap:7,fontSize:12,color:'#aeb9b6',marginBottom:14}}>Сонгох<select style={field} value={selected} onChange={e=>{setSelected(e.target.value);setDraft([]);}}><option value="">Сонгох...</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
   {!loading&&options.length===0&&<div style={{padding:12,marginBottom:12,border:'1px solid #66521c',borderRadius:9,background:'#241f10',color:'#e8d28a',fontSize:12,lineHeight:1.6}}>
    {mode==='block'?'Одоогоор идэвхтэй блок бүртгээгүй байна.':'Одоогоор идэвхтэй мөргөцөг бүртгээгүй байна.'}
    <div style={{marginTop:8}}><a href="/mine-areas" style={{color:'#f4c62f',fontWeight:800}}>Блок, мөргөцөг бүртгэх →</a></div>
   </div>}
   <div style={{display:'flex',gap:7,alignItems:'center',color:'#c4cfca',fontSize:12,marginBottom:12}}><MousePointer2 size={15} color="#f4c62f"/> {draft.length} цэг тэмдэглэсэн</div>
   <button onClick={()=>setDraft(p=>p.slice(0,-1))} disabled={!draft.length||saving} style={{...field,display:'flex',gap:8,alignItems:'center',justifyContent:'center',marginBottom:8,cursor:'pointer',opacity:draft.length?1:.45}}><Undo2 size={15}/> Сүүлийн цэг буцаах</button>
   <button onClick={()=>setDraft([])} disabled={!draft.length||saving} style={{...field,display:'flex',gap:8,alignItems:'center',justifyContent:'center',marginBottom:8,cursor:'pointer',opacity:draft.length?1:.45}}><Eraser size={15}/> Шинээр эхлэх</button>
   <button onClick={()=>void save()} disabled={saving||draft.length<3||!selected} style={{...field,background:'#f4c62f',color:'#171717',fontWeight:800,border:0,display:'flex',gap:8,alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:draft.length>=3&&selected?1:.5}}><Check size={16}/> {saving?'Хадгалж байна...':'Зураглал хадгалах'}</button>
   <button onClick={()=>void clearShape()} disabled={saving||!currentShape} style={{...field,marginTop:8,color:'#ffb5a8',cursor:'pointer'}}><Eraser size={14} style={{verticalAlign:'middle'}}/> Хадгалсан дүрс арилгах</button>
  </section>
  <section style={box}><h2 style={{fontSize:14,margin:'0 0 10px'}}>Тайлбар</h2><p style={{fontSize:12,color:'#aeb9b6',lineHeight:1.6,margin:0}}>Энэ хувилбар нь 2D схем зураглал. GPS, бодит координат, CAD/DXF импорт хараахан холбогдоогүй. Дараагийн шатанд уурхайн хэмжилтийн координат, масштаб, зураг импортлох боломж нэмнэ.</p></section>
 </aside>
 </div></div></main>;
}
