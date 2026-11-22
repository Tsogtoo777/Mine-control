'use client';

import { useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, Boxes, CalendarDays, ChevronDown,
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
  { label: 'Ээлжийн бүртгэл', icon: CalendarDays, group: 'ҮЙЛ АЖИЛЛАГАА' },
  { label: 'Техникийн бүртгэл', icon: Gauge },
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

export default function DashboardClient() {
  const [active, setActive] = useState('Ерөнхий хяналт');
  const [period, setPeriod] = useState('Өнөөдөр');
  const [mobileOpen, setMobileOpen] = useState(false);

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
              <button className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => {if(item.label === 'Ажилтнууд'){window.location.href='/employees';return;}if(item.label === 'Техникийн бүртгэл'){window.location.href='/equipment';return;}if(item.label === 'Блок, мөргөцөг'){window.location.href='/mine-areas';return;}setActive(item.label);setMobileOpen(false);}}>
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
          <div className="top-actions"><div className="searchbox"><Search size={15}/><span>Хайх...</span><kbd>⌘ K</kbd></div><button className="icon-btn"><Bell size={18}/><i/></button><div className="profile"><div className="avatar">А</div><div><b>Админ</b><small>Системийн админ</small></div><ChevronDown size={14}/></div></div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><div className="eyebrow">УУРХАЙН НЭГДСЭН УДИРДЛАГА</div><h1>{active}</h1><p>Уулын ажлын бүртгэл, үйлдвэрлэлийн мэдээллийн тойм</p></div>
            <div className="heading-actions"><button className="btn secondary"><Download size={16}/> Тайлан татах</button><button className="btn primary"><Plus size={17}/> Шинэ бүртгэл</button></div>
          </div>

          <div className="toolbar"><div className="live-label"><span className="pulse"/> DEMO ӨГӨГДӨЛГҮЙ</div><div className="filters"><button className="filter"><CalendarDays size={15}/>{period}<ChevronDown size={14}/></button><select aria-label="Ээлж"><option>Бүх ээлж</option><option>Өдөр</option><option>Шөнө</option></select></div></div>

          <div className="kpi-grid">{kpis.map((k) => {const Icon = k.icon;return <article className="kpi-card" key={k.label}><div className="kpi-top"><span>{k.label}</span><div className={`kpi-icon ${k.tone}`}><Icon size={18}/></div></div><div className="kpi-value">{k.value}<small>{k.unit}</small></div><div className="kpi-foot">{k.change}</div></article>;})}</div>

          <div className="section-grid">
            <article className="panel production-panel">
              <div className="panel-heading"><div><h2>Үйлдвэрлэлийн гүйцэтгэл</h2><p>Хүдэр, хөрсний хэмжээ · м³</p></div><button className="select-btn" onClick={() => setPeriod(period === 'Өнөөдөр' ? 'Энэ сар' : 'Өнөөдөр')}>{period}<ChevronDown size={14}/></button></div>
              <div className="empty-chart"><div className="chart-icon"><Activity size={23}/></div><b>Одоогоор үйлдвэрлэлийн мэдээлэл алга</b><span>Бүртгэл оруулсны дараа график автоматаар шинэчлэгдэнэ.</span><div className="chart-lines"><i/><i/><i/><i/></div></div>
              <div className="legend"><span><i className="ore"/>Хүдэр</span><span><i className="waste"/>Хөрс</span></div>
            </article>
            <article className="panel shift-panel">
              <div className="panel-heading"><div><h2>Ээлжийн мэдээлэл</h2><p>Өдөр / Шөнийн ээлж</p></div><CalendarDays size={18} className="muted"/></div>
              <div className="shift-card"><div className="shift-time"><span>ӨДРИЙН ЭЭЛЖ</span><b>07:00 — 19:00</b></div><div className="shift-state">Бүртгэл хүлээгдэж байна</div></div>
              <div className="shift-card"><div className="shift-time"><span>ШӨНИЙН ЭЭЛЖ</span><b>19:00 — 07:00</b></div><div className="shift-state">Бүртгэл хүлээгдэж байна</div></div>
              <div className="shift-note"><Clock3 size={15}/> Ээлжийн огноог эхэлсэн өдрөөр тооцно.</div>
            </article>
          </div>

          <article className="panel records-panel">
            <div className="panel-heading"><div><h2>Сүүлийн бүртгэлүүд</h2><p>Уулын ажил, олборлолт, тээвэрлэлтийн бүртгэл</p></div><button className="text-btn">Бүгдийг харах <ArrowUpRight size={14}/></button></div>
            <div className="table-wrap"><table><thead><tr><th>БҮРТГЭЛИЙН ТӨРӨЛ</th><th>ТЕХНИК / БАЙРШИЛ</th><th>ЭЭЛЖ</th><th>ХЭМЖЭЭ</th><th>ТӨЛӨВ</th></tr></thead><tbody><tr><td colSpan={5}><div className="empty-table"><ClipboardList size={22}/><b>Бүртгэл хараахан үүсээгүй байна</b><span>Эхний бүртгэлээ үүсгэсний дараа энд харагдана.</span></div></td></tr></tbody></table></div>
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
