'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Activity, ArrowDownRight, ArrowUpRight, Boxes, CalendarDays, ChevronDown, Drill,
  ClipboardList, FileSpreadsheet, Gauge, LayoutDashboard, Map, Mountain,
  Settings, Truck, Wrench, Users, Menu, Search, Bell, Plus, Download,
  CircleDot, Clock3, Layers3, Pickaxe, ShieldCheck
} from 'lucide-react';

const nav = [
  { label: 'Ерөнхий хяналт', icon: LayoutDashboard, group: 'ҮНДСЭН' },
  { label: 'Уулын ажлын бүртгэл', icon: Mountain },
  { label: 'Олборлолтын бүртгэл', icon: Pickaxe },
  { label: 'Тээвэрлэлтийн бүртгэл', icon: Truck },
  { label: 'Блок, мөргөцөг', icon: Map },
  { label: '2D уурхайн зураглал', icon: Map },
  { label: 'Ээлжийн бүртгэл', icon: CalendarDays, group: 'ҮЙЛ АЖИЛЛАГАА' },
  { label: 'Техникийн бүртгэл', icon: Gauge },
  { label: 'Өрөмдлөг ба мото цаг', icon: Drill },
  { label: 'Засвар үйлчилгээ', icon: Wrench },
  { label: 'Ажилтнууд', icon: Users },
  { label: 'Төлөвлөгөө, гүйцэтгэл', icon: Activity, group: 'УДИРДЛАГА' },
  { label: 'Тайлан, Excel', icon: FileSpreadsheet },
  { label: 'Тохиргоо', icon: Settings },
];

const kpis = [
  { label: 'Өнөөдрийн олборлолт', value: '—', unit: 'м³', change: 'Мэдээлэл хүлээгдэж байна', icon: Pickaxe, tone: 'yellow' },
  { label: 'Нийт тээвэрлэлт', value: '—', unit: 'рейс', change: 'Ээлжийн бүртгэлээр', icon: Truck, tone: 'blue' },
  { label: 'Ажиллаж буй техник', value: '—', unit: 'ширхэг', change: 'Техникийн бүртгэлээр', icon: Gauge, tone: 'green' },
  { label: 'Баталгаажсан бүртгэл', value: '—', unit: 'мөр', change: 'Өнөөдрийн бүртгэл', icon: ShieldCheck, tone: 'purple' },
];

type Rec={id:string;shift_id:string;volume_m3?:number|null;trip_count?:number|null;status:string;measured_at?:string;started_at?:string;departed_at?:string;material?:string};
type ShiftRow={id:string;shift_date:string;shift_kind:'day'|'night';starts_at:string;ends_at:string};
const localDay=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const nfmt=(n:number)=>Number(n||0).toLocaleString('mn-MN',{maximumFractionDigits:1});
export default function DashboardClient() {
  const [active, setActive] = useState('Ерөнхий хяналт');
  const [period, setPeriod] = useState('Өнөөдөр');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shiftFilter,setShiftFilter]=useState('all');
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [production,setProduction]=useState<Rec[]>([]);
  const [hauls,setHauls]=useState<Rec[]>([]);
  const [works,setWorks]=useState<Rec[]>([]);const [drills,setDrills]=useState<{id:string;shift_id:string;drilled_meters:number;drilled_holes:number;status:string}[]>([]);const [equipmentHours,setEquipmentHours]=useState<{id:string;shift_id:string;worked_hours:number;status:string}[]>([]);
  const [shifts,setShifts]=useState<ShiftRow[]>([]);
  const [activeEquipment,setActiveEquipment]=useState(0);
  const [displayName,setDisplayName]=useState('Хэрэглэгч');
  const [roleName,setRoleName]=useState('Системийн хэрэглэгч');
  useEffect(()=>{let cancelled=false;async function load(){
    setLoading(true);setLoadError('');const db=createClient();
    if(!db){setLoadError('Supabase тохиргоо олдсонгүй.');setLoading(false);return;}
    const now=new Date();const end=localDay(now);const start=period==='Энэ сар'?localDay(new Date(now.getTime()-29*86400000)):end;
    const [auth,eq,profile,sr]=await Promise.all([db.auth.getUser(),db.from('equipment').select('id',{count:'exact',head:true}).eq('is_active',true),db.from('profiles').select('display_name,role').maybeSingle(),db.from('shifts').select('id,shift_date,shift_kind,starts_at,ends_at').gte('shift_date',start).lte('shift_date',end).order('shift_date')]);
    if(cancelled)return;if(eq.error||sr.error){setLoadError((eq.error||sr.error)!.message);setLoading(false);return;}
    setActiveEquipment(eq.count||0);if(profile.data){setDisplayName(profile.data.display_name||auth.data.user?.email?.split('@')[0]||'Хэрэглэгч');setRoleName(profile.data.role||'Системийн хэрэглэгч');}else if(auth.data.user?.email)setDisplayName(auth.data.user.email.split('@')[0]);
    const all=(sr.data||[]) as ShiftRow[];setShifts(all);const chosen=shiftFilter==='all'?all:all.filter(s=>s.shift_kind===shiftFilter);const ids=chosen.map(s=>s.id);
    if(!ids.length){setProduction([]);setHauls([]);setWorks([]);setDrills([]);setEquipmentHours([]);setLoading(false);return;}
    const [p,h,w,d,eh]=await Promise.all([db.from('production_records').select('id,shift_id,volume_m3,status,measured_at,material').in('shift_id',ids).neq('status','voided').order('measured_at',{ascending:false}).limit(500),db.from('haul_records').select('id,shift_id,trip_count,status,departed_at').in('shift_id',ids).neq('status','voided').order('departed_at',{ascending:false}).limit(500),db.from('work_records').select('id,shift_id,volume_m3,status,started_at').in('shift_id',ids).neq('status','voided').order('started_at',{ascending:false}).limit(500),db.from('drill_records').select('id,shift_id,drilled_meters,drilled_holes,status').in('shift_id',ids).neq('status','voided').limit(500),db.from('equipment_hour_records').select('id,shift_id,worked_hours,status').in('shift_id',ids).neq('status','voided').limit(500)]);
    if(cancelled)return;const err=p.error||h.error||w.error||d.error||eh.error;if(err)setLoadError(err.message);setProduction((p.data||[]) as Rec[]);setHauls((h.data||[]) as Rec[]);setWorks((w.data||[]) as Rec[]);setDrills((d.data||[]) as typeof drills);setEquipmentHours((eh.data||[]) as typeof equipmentHours);setLoading(false);
  }void load();return()=>{cancelled=true;};},[period,shiftFilter]);
  const shiftMap=useMemo(()=>new globalThis.Map(shifts.map(s=>[s.id,s])),[shifts]);
  const totalProduction=production.reduce((a,r)=>a+Number(r.volume_m3||0),0);
  const today=localDay(new Date());
  const todayProduction=production.filter(r=>shiftMap.get(r.shift_id)?.shift_date===today).reduce((a,r)=>a+Number(r.volume_m3||0),0);
  const totalTrips=hauls.reduce((a,r)=>a+Number(r.trip_count||0),0);const totalDrilledMeters=drills.reduce((a,r)=>a+Number(r.drilled_meters||0),0);const totalDrilledHoles=drills.reduce((a,r)=>a+Number(r.drilled_holes||0),0);const totalMotohours=equipmentHours.reduce((a,r)=>a+Number(r.worked_hours||0),0);
  const approved=[...production,...hauls,...works].filter(r=>r.status==='approved').length;
  const latest=[...production.map(r=>({id:r.id,type:'Олборлолт',date:r.measured_at||'',amount:nfmt(Number(r.volume_m3||0))+' м³',status:r.status,shift:shiftMap.get(r.shift_id)})),...hauls.map(r=>({id:r.id,type:'Тээвэрлэлт',date:r.departed_at||'',amount:nfmt(Number(r.trip_count||0))+' рейс',status:r.status,shift:shiftMap.get(r.shift_id)})),...works.map(r=>({id:r.id,type:'Уулын ажил',date:r.started_at||'',amount:nfmt(Number(r.volume_m3||0))+' м³',status:r.status,shift:shiftMap.get(r.shift_id)}))].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,7);

  return (
    <main className="shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Mountain size={23} /></div>
          <div><div className="brand-name">MINE<span>CONTROL</span></div><div className="brand-sub">MINING OPERATIONS</div></div>
        </div>
        <div className="mine-select"><div className="mine-avatar">MC</div><div className="mine-meta"><b>Ил уурхай</b><small>Үндсэн талбай</small></div><ChevronDown size={15}/></div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return <div key={item.label}>
              {item.group && <div className="nav-group">{item.group}</div>}
              <button className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => {if(item.label === 'Ажилтнууд'){window.location.href='/employees';return;}if(item.label === 'Техникийн бүртгэл'){window.location.href='/equipment';return;}if(item.label === 'Өрөмдлөг ба мото цаг'){window.location.href='/drilling';return;}if(item.label === 'Блок, мөргөцөг'){window.location.href='/mine-areas';return;}if(item.label === '2D уурхайн зураглал'){window.location.href='/mine-map';return;}if(item.label === 'Ээлжийн бүртгэл'){window.location.href='/shifts';return;}if(item.label === 'Уулын ажлын бүртгэл'){window.location.href='/work-records';return;}if(item.label === 'Олборлолтын бүртгэл'){window.location.href='/production';return;}if(item.label === 'Тээвэрлэлтийн бүртгэл'){window.location.href='/haul-records';return;}if(item.label === 'Засвар үйлчилгээ'){window.location.href='/maintenance';return;}if(item.label === 'Төлөвлөгөө, гүйцэтгэл'){window.location.href='/plan-performance';return;}if(item.label === 'Тайлан, Excel'){window.location.href='/reports';return;}if(item.label === 'Тохиргоо'){window.location.href='/settings';return;}setActive(item.label);setMobileOpen(false);}}>
                <Icon size={17}/><span>{item.label}</span>
                {item.label === 'Тайлан, Excel' && <span className="nav-tag">XLS</span>}
              </button>
            </div>;
          })}
        </nav>
        <div className="sidebar-bottom"><div className="status-dot"/>Системийн төлөв хэвийн<div className="version">MINE CONTROL · V1.0</div></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={19}/></button>
          <div className="breadcrumbs">MINE CONTROL <span>/</span> {active}</div>
          <div className="top-actions"><div className="searchbox"><Search size={15}/><span>Хайх...</span><kbd>⌘ K</kbd></div><button className="icon-btn"><Bell size={18}/><i/></button><div className="profile"><div className="avatar">{displayName.slice(0,1).toUpperCase()}</div><div><b>{displayName}</b><small>{roleName}</small></div><ChevronDown size={14}/></div></div>
        </header>

        <div className="content">{loadError&&<div role="alert" style={{padding:12,marginBottom:14,border:"1px solid #7f3434",borderRadius:8,color:"#ffb5a8"}}>{loadError}</div>}
          <div className="page-heading">
            <div><div className="eyebrow">УУРХАЙН НЭГДСЭН УДИРДЛАГА</div><h1>{active}</h1><p>Уулын ажлын бүртгэл, үйлдвэрлэлийн мэдээллийн тойм</p></div>
            <div className="heading-actions"><button className="btn secondary"><Download size={16}/> Тайлан татах</button><button className="btn primary"><Plus size={17}/> Шинэ бүртгэл</button></div>
          </div>

          <div className="toolbar"><div className="live-label"><span className="pulse"/> {loading?"ӨГӨГДӨЛ УНШИЖ БАЙНА":loadError?"ХОЛБОЛТЫН АЛДАА":"LIVE ӨГӨГДӨЛ"}</div><div className="filters"><button className="filter" onClick={()=>setPeriod(period==="Өнөөдөр"?"Энэ сар":"Өнөөдөр")}><CalendarDays size={15}/>{period}<ChevronDown size={14}/></button><select aria-label="Ээлж" value={shiftFilter} onChange={e=>setShiftFilter(e.target.value)}><option value="all">Бүх ээлж</option><option value="day">Өдөр</option><option value="night">Шөнө</option></select></div></div>

          <div className="kpi-grid">{kpis.map((k,i) => {const Icon=k.icon;const value=i===0?nfmt(period==="Өнөөдөр"?todayProduction:totalProduction):i===1?nfmt(totalTrips):i===2?nfmt(activeEquipment):nfmt(approved);const note=i===0?(period==="Өнөөдөр"?"Өнөөдрийн бодит хэмжээ":"Сонгосон хугацааны нийт"):i===1?"Хүчингүй рейс хассан":i===2?"Идэвхтэй техникийн бүртгэл":"Баталгаажсан мөр";return <article className="kpi-card" key={k.label}><div className="kpi-top"><span>{k.label}</span><div className={`kpi-icon ${k.tone}`}><Icon size={18}/></div></div><div className="kpi-value">{loading?"—":value}<small>{k.unit}</small></div><div className="kpi-foot">{note}</div></article>;})}</div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,marginBottom:18}}>
            <article className="panel" style={{margin:0}}><div className="panel-heading"><div><h2>Өрөмдлөгийн бүтээл</h2><p>Сонгосон ээлжийн нийт</p></div><Drill size={18} className="muted"/></div><div className="kpi-value">{loading?'—':nfmt(totalDrilledMeters)}<small>м</small></div><div className="kpi-foot">{nfmt(totalDrilledHoles)} цооног</div></article>
            <article className="panel" style={{margin:0}}><div className="panel-heading"><div><h2>Техникийн мото цаг</h2><p>Ажилласан нийт цаг</p></div><Gauge size={18} className="muted"/></div><div className="kpi-value">{loading?'—':nfmt(totalMotohours)}<small>цаг</small></div><div className="kpi-foot">Мото цагийн бүртгэлээс</div></article>
          </div>
          <div className="section-grid">
            <article className="panel production-panel">
              <div className="panel-heading"><div><h2>Үйлдвэрлэлийн гүйцэтгэл</h2><p>Хүдэр, хөрсний хэмжээ · м³</p></div><button className="select-btn" onClick={() => setPeriod(period === 'Өнөөдөр' ? 'Энэ сар' : 'Өнөөдөр')}>{period}<ChevronDown size={14}/></button></div>
              <div className="empty-chart">{loading?<b>Өгөгдөл уншиж байна...</b>:totalProduction>0?<div style={{padding:24,color:"#d9e0dc"}}>Хүдэр: <b>{nfmt(production.filter(r=>r.material==="ore").reduce((a,r)=>a+Number(r.volume_m3||0),0))} м³</b> · Хөрс: <b>{nfmt(production.filter(r=>r.material==="waste").reduce((a,r)=>a+Number(r.volume_m3||0),0))} м³</b><p style={{fontSize:12,color:"#899393"}}>Сонгосон хугацааны нийт олборлолт: {nfmt(totalProduction)} м³</p></div>:<><div className="chart-icon"><Activity size={23}/></div><b>Одоогоор үйлдвэрлэлийн мэдээлэл алга</b><span>Олборлолтын бүртгэл оруулсны дараа энд харагдана.</span><div className="chart-lines"><i/><i/><i/><i/></div></>}</div>
              <div className="legend"><span><i className="ore"/>Хүдэр</span><span><i className="waste"/>Хөрс</span></div>
            </article>
            <article className="panel shift-panel">
              <div className="panel-heading"><div><h2>Ээлжийн мэдээлэл</h2><p>Өдөр / Шөнийн ээлж</p></div><CalendarDays size={18} className="muted"/></div>
              {(["day","night"] as const).map(kind=>{const row=[...shifts].reverse().find(s=>s.shift_kind===kind);return <div className="shift-card" key={kind}><div className="shift-time"><span>{kind==="day"?"ӨДРИЙН ЭЭЛЖ":"ШӨНИЙН ЭЭЛЖ"}</span><b>{kind==="day"?"07:00 — 19:00":"19:00 — 07:00"}</b></div><div className="shift-state">{row?row.shift_date+" · Ээлж бүртгэгдсэн":"Ээлжийн бүртгэл алга"}</div></div>;})}
              <div className="shift-note"><Clock3 size={15}/> Ээлжийн огноог эхэлсэн өдрөөр тооцно.</div>
            </article>
          </div>

          <article className="panel records-panel">
            <div className="panel-heading"><div><h2>Сүүлийн бүртгэлүүд</h2><p>Уулын ажил, олборлолт, тээвэрлэлт, өрөмдлөгийн бүртгэл</p></div><button className="text-btn">Бүгдийг харах <ArrowUpRight size={14}/></button></div>
            <div className="table-wrap"><table><thead><tr><th>БҮРТГЭЛИЙН ТӨРӨЛ</th><th>ОГНОО / ЭЭЛЖ</th><th>ХЭМЖЭЭ</th><th>ТӨЛӨВ</th></tr></thead><tbody>{loading?<tr><td colSpan={4}>Уншиж байна...</td></tr>:latest.length===0?<tr><td colSpan={4}><div className="empty-table"><ClipboardList size={22}/><b>Бүртгэл хараахан үүсээгүй байна</b></div></td></tr>:latest.map(r=><tr key={r.id}><td>{r.type}</td><td>{r.shift?.shift_date||r.date.slice(0,10)} · {r.shift?.shift_kind==="day"?"Өдөр":r.shift?.shift_kind==="night"?"Шөнө":"—"}</td><td>{r.amount}</td><td>{r.status==="approved"?"Баталсан":r.status==="submitted"?"Илгээсэн":r.status==="draft"?"Ноорог":r.status}</td></tr>)}</tbody></table></div>
          </article>

          <div className="bottom-grid">
            <article className="panel quick-panel"><div className="panel-heading"><div><h2>Шуурхай бүртгэл</h2><p>Түгээмэл үйлдлүүд</p></div></div><div className="quick-actions"><button><Mountain size={18}/><span>Уулын ажил</span><Plus size={15}/></button><button><Pickaxe size={18}/><span>Олборлолт</span><Plus size={15}/></button><button><Truck size={18}/><span>Тээврийн рейс</span><Plus size={15}/></button><button><Layers3 size={18}/><span>Блок, мөргөцөг</span><Plus size={15}/></button></div></article>
            <article className="panel setup-panel"><div className="panel-heading"><div><h2>Системийн тохиргоо</h2><p>V1 суурь тохиргоо</p></div><Boxes size={18} className="muted"/></div><div className="setup-list"><div><span>Уурхайн төрөл</span><b>Ил уурхай</b></div><div><span>Үндсэн нэгж</span><b>м³</b></div><div><span>Тээврийн арга</span><b>Рейс</b></div><div><span>Зураглал</span><b>2D</b></div><div><span>Өгөгдлийн холболт</span><b className="pending">Тохируулаагүй</b></div></div></article>
          </div>
          <footer>© 2026 MINE CONTROL <span>·</span> Уул уурхайн бүртгэл, мэдээллийн систем <span className="footer-right">V1.0 STARTER</span></footer>
        </div>
      </section>
    </main>
  );
}
