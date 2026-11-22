'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, Layers3, LoaderCircle, MapPinned, Plus, RefreshCw, Search, Mountain, Pickaxe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Area = { id: string; area_code: string; area_name: string; description: string | null; is_active: boolean };
type Block = { id: string; area_id: string; block_code: string; level_name: string | null; design_volume_m3: number | null; is_active: boolean };
type Face = { id: string; block_id: string; face_code: string; material: 'ore' | 'waste' | 'other'; is_active: boolean };

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0b1010', color: '#f5f5f0',
  border: '1px solid #303939', borderRadius: 9, padding: '11px 12px', outline: 'none',
};
const sectionStyle: CSSProperties = { background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 };
const labelStyle: CSSProperties = { display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 };

export default function MineAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [blockArea, setBlockArea] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [level, setLevel] = useState('');
  const [volume, setVolume] = useState('');
  const [faceBlock, setFaceBlock] = useState('');
  const [faceCode, setFaceCode] = useState('');
  const [material, setMaterial] = useState<'ore' | 'waste' | 'other'>('ore');
  const [tab, setTab] = useState<'areas' | 'blocks' | 'faces'>('areas');

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setLoading(false); return; }
    const [a, b, f] = await Promise.all([
      supabase.from('mine_areas').select('id, area_code, area_name, description, is_active').order('area_code'),
      supabase.from('mine_blocks').select('id, area_id, block_code, level_name, design_volume_m3, is_active').order('block_code'),
      supabase.from('mine_faces').select('id, block_id, face_code, material, is_active').order('face_code'),
    ]);
    const firstError = a.error || b.error || f.error;
    if (firstError) setError(firstError.message);
    else {
      setAreas((a.data ?? []) as Area[]);
      setBlocks((b.data ?? []) as Block[]);
      setFaces((f.data ?? []) as Face[]);
      if (!blockArea && a.data?.[0]) setBlockArea(a.data[0].id);
      if (!faceBlock && b.data?.[0]) setFaceBlock(b.data[0].id);
    }
    setLoading(false);
  }, [blockArea, faceBlock]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function saveArea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: err } = await supabase.from('mine_areas').insert({ area_code: areaCode.trim(), area_name: areaName.trim(), description: areaDescription.trim() || null });
    if (err) setError(err.code === '23505' ? 'Энэ талбайн код бүртгэлтэй байна.' : err.message);
    else { setAreaCode(''); setAreaName(''); setAreaDescription(''); setNotice('Уурхайн талбай нэмэгдлээ.'); await loadAll(); }
    setSaving(false);
  }

  async function saveBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    if (!blockArea) { setError('Эхлээд уурхайн талбай бүртгэнэ үү.'); setSaving(false); return; }
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: err } = await supabase.from('mine_blocks').insert({
      area_id: blockArea, block_code: blockCode.trim(), level_name: level.trim() || null,
      design_volume_m3: volume.trim() ? Number(volume) : null,
    });
    if (err) setError(err.code === '23505' ? 'Энэ блокийн код тухайн талбайд бүртгэлтэй байна.' : err.message);
    else { setBlockCode(''); setLevel(''); setVolume(''); setNotice('Блок амжилттай нэмэгдлээ.'); await loadAll(); }
    setSaving(false);
  }

  async function saveFace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    if (!faceBlock) { setError('Эхлээд блок бүртгэнэ үү.'); setSaving(false); return; }
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: err } = await supabase.from('mine_faces').insert({ block_id: faceBlock, face_code: faceCode.trim(), material });
    if (err) setError(err.message);
    else { setFaceCode(''); setNotice('Мөргөцөг амжилттай нэмэгдлээ.'); await loadAll(); }
    setSaving(false);
  }

  async function toggle(table: 'mine_areas' | 'mine_blocks' | 'mine_faces', id: string, active: boolean, label: string) {
    setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); return; }
    const { error: err } = await supabase.from(table).update({ is_active: !active }).eq('id', id);
    if (err) setError(err.message);
    else { setNotice(label + (active ? ' идэвхгүй боллоо.' : ' идэвхжлээ.')); await loadAll(); }
  }

  const areaById = useMemo(() => new Map(areas.map(x => [x.id, x.area_name])), [areas]);
  const blockById = useMemo(() => new Map(blocks.map(x => [x.id, x.block_code])), [blocks]);
  const filteredAreas = areas.filter(x => [x.area_code, x.area_name, x.description].some(v => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const filteredBlocks = blocks.filter(x => [x.block_code, x.level_name, areaById.get(x.area_id)].some(v => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const filteredFaces = faces.filter(x => [x.face_code, blockById.get(x.block_id), x.material].some(v => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const buttonStyle: CSSProperties = { border: 0, borderRadius: 9, padding: '10px 14px', background: '#f4c62f', color: '#171717', fontWeight: 800, cursor: saving ? 'wait' : 'pointer' };
  const tabStyle = (selected: boolean): CSSProperties => ({ border: '1px solid ' + (selected ? '#b48d19' : '#303939'), borderRadius: 8, padding: '9px 13px', background: selected ? '#332a12' : '#171e1e', color: selected ? '#f4c62f' : '#c4cfca', cursor: 'pointer' });

  return (
    <main style={{ minHeight: '100vh', background: '#090b0b', color: '#f5f5f0', padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <a href="/" style={{ color: '#f4c62f', textDecoration: 'none', display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 13, marginBottom: 16 }}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
            <div style={{ color: '#f4c62f', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>УУРХАЙН БАЙРШЛЫН БҮРТГЭЛ</div>
            <h1 style={{ fontSize: 28, margin: '8px 0' }}>Блок, мөргөцөг</h1>
            <p style={{ color: '#899393', fontSize: 13, margin: 0 }}>Талбай → Блок → Мөргөцөг гэсэн шаталсан бүртгэл.</p>
          </div>
          <div style={{ display: 'flex', gap: 18, color: '#f4c62f', flexWrap: 'wrap' }}><b><MapPinned size={17} style={{ verticalAlign: 'middle' }}/> {areas.length} талбай</b><b><Layers3 size={17} style={{ verticalAlign: 'middle' }}/> {blocks.length} блок</b><b><Pickaxe size={17} style={{ verticalAlign: 'middle' }}/> {faces.length} мөргөцөг</b></div>
        </header>

        {(error || notice) && <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 9, border: '1px solid '+(error ? '#7f3434' : '#376447'), background: error ? '#351b1b' : '#14251b', color: error ? '#ffb5a8' : '#a8e6bd', fontSize: 13 }}>{error || notice}</div>}

        <section style={sectionStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <button style={tabStyle(tab === 'areas')} onClick={() => setTab('areas')}>Талбай ({areas.length})</button>
            <button style={tabStyle(tab === 'blocks')} onClick={() => setTab('blocks')}>Блок ({blocks.length})</button>
            <button style={tabStyle(tab === 'faces')} onClick={() => setTab('faces')}>Мөргөцөг ({faces.length})</button>
          </div>

          {tab === 'areas' && <>
            <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Шинэ талбай бүртгэх</h2>
            <form onSubmit={saveArea} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
              <label style={labelStyle}>Талбайн код<input style={inputStyle} value={areaCode} onChange={e=>setAreaCode(e.target.value)} placeholder="Ж: PIT-01" required/></label>
              <label style={labelStyle}>Талбайн нэр<input style={inputStyle} value={areaName} onChange={e=>setAreaName(e.target.value)} placeholder="Ж: Баруун карьер" required/></label>
              <label style={labelStyle}>Тайлбар<input style={inputStyle} value={areaDescription} onChange={e=>setAreaDescription(e.target.value)} placeholder="Сонголтоор"/></label>
              <button disabled={saving} style={buttonStyle}><Plus size={15} style={{ verticalAlign: 'middle' }}/> Талбай нэмэх</button>
            </form>
          </>}

          {tab === 'blocks' && <>
            <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Шинэ блок бүртгэх</h2>
            <form onSubmit={saveBlock} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
              <label style={labelStyle}>Уурхайн талбай<select style={inputStyle} value={blockArea} onChange={e=>setBlockArea(e.target.value)} required><option value="">Талбай сонгох</option>{areas.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.area_code} · {x.area_name}</option>)}</select></label>
              <label style={labelStyle}>Блокийн код<input style={inputStyle} value={blockCode} onChange={e=>setBlockCode(e.target.value)} placeholder="Ж: B-120" required/></label>
              <label style={labelStyle}>Догол / түвшин<input style={inputStyle} value={level} onChange={e=>setLevel(e.target.value)} placeholder="Ж: 1250"/></label>
              <label style={labelStyle}>Төлөвлөсөн хэмжээ (м³)<input style={inputStyle} type="number" min="0" step="0.01" value={volume} onChange={e=>setVolume(e.target.value)} placeholder="Сонголтоор"/></label>
              <button disabled={saving || !areas.some(x=>x.is_active)} style={buttonStyle}><Plus size={15} style={{ verticalAlign: 'middle' }}/> Блок нэмэх</button>
            </form>
          </>}

          {tab === 'faces' && <>
            <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Шинэ мөргөцөг бүртгэх</h2>
            <form onSubmit={saveFace} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
              <label style={labelStyle}>Блок сонгох<select style={inputStyle} value={faceBlock} onChange={e=>setFaceBlock(e.target.value)} required><option value="">Блок сонгох</option>{blocks.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{areaById.get(x.area_id) || 'Талбай'} · {x.block_code}</option>)}</select></label>
              <label style={labelStyle}>Мөргөцгийн код<input style={inputStyle} value={faceCode} onChange={e=>setFaceCode(e.target.value)} placeholder="Ж: F-01" required/></label>
              <label style={labelStyle}>Материалын төрөл<select style={inputStyle} value={material} onChange={e=>setMaterial(e.target.value as 'ore' | 'waste' | 'other')}><option value="ore">Хүдэр</option><option value="waste">Хөрс</option><option value="other">Бусад</option></select></label>
              <button disabled={saving || !blocks.some(x=>x.is_active)} style={buttonStyle}><Plus size={15} style={{ verticalAlign: 'middle' }}/> Мөргөцөг нэмэх</button>
            </form>
          </>}
        </section>

        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Бүртгэлийн жагсаалт</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1010', border: '1px solid #303939', borderRadius: 9, padding: '0 10px' }}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Код, нэрээр хайх..." style={{ ...inputStyle, border: 0, width: 210, padding: '10px 0' }}/></div>
              <button onClick={()=>void loadAll()} style={{ border: '1px solid #303939', borderRadius: 9, padding: '9px 11px', background: '#171e1e', color: '#dce3df', cursor: 'pointer' }}><RefreshCw size={16}/></button>
            </div>
          </div>

          {tab === 'areas' && <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}><thead><tr>{['КОД','ТАЛБАЙН НЭР','ТАЙЛБАР','БЛОК','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, padding: 11, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr> : filteredAreas.length === 0 ? <tr><td colSpan={6} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор талбай бүртгээгүй байна.</td></tr> : filteredAreas.map(x=><tr key={x.id}><td style={{padding:12,borderBottom:'1px solid #202828',color:'#f4c62f'}}>{x.area_code}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{x.area_name}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:'#aeb9b6'}}>{x.description || '—'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{blocks.filter(b=>b.area_id===x.id).length}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:x.is_active?'#8cdaa7':'#f1a29a'}}>{x.is_active?'Идэвхтэй':'Идэвхгүй'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}><button onClick={()=>void toggle('mine_areas',x.id,x.is_active,x.area_code)} style={{background:'transparent',border:'1px solid #394343',borderRadius:7,color:'#dce3df',padding:'6px 9px',cursor:'pointer'}}>{x.is_active?'Идэвхгүй болгох':'Идэвхжүүлэх'}</button></td></tr>)}</tbody></table></div>}

          {tab === 'blocks' && <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}><thead><tr>{['БЛОКИЙН КОД','ТАЛБАЙ','ДОГОЛ / ТҮВШИН','ТӨЛӨВЛӨСӨН М³','МӨРГӨЦӨГ','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, padding: 11, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr> : filteredBlocks.length === 0 ? <tr><td colSpan={7} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор блок бүртгээгүй байна.</td></tr> : filteredBlocks.map(x=><tr key={x.id}><td style={{padding:12,borderBottom:'1px solid #202828',color:'#f4c62f'}}>{x.block_code}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{areaById.get(x.area_id)||'—'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{x.level_name||'—'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{x.design_volume_m3??'—'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{faces.filter(f=>f.block_id===x.id).length}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:x.is_active?'#8cdaa7':'#f1a29a'}}>{x.is_active?'Идэвхтэй':'Идэвхгүй'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}><button onClick={()=>void toggle('mine_blocks',x.id,x.is_active,x.block_code)} style={{background:'transparent',border:'1px solid #394343',borderRadius:7,color:'#dce3df',padding:'6px 9px',cursor:'pointer'}}>{x.is_active?'Идэвхгүй болгох':'Идэвхжүүлэх'}</button></td></tr>)}</tbody></table></div>}

          {tab === 'faces' && <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}><thead><tr>{['МӨРГӨЦГИЙН КОД','БЛОК','МАТЕРИАЛ','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, padding: 11, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={5} style={{padding:28,textAlign:'center'}}>Уншиж байна...</td></tr> : filteredFaces.length === 0 ? <tr><td colSpan={5} style={{padding:28,textAlign:'center',color:'#899393'}}>Одоогоор мөргөцөг бүртгээгүй байна.</td></tr> : filteredFaces.map(x=><tr key={x.id}><td style={{padding:12,borderBottom:'1px solid #202828',color:'#f4c62f'}}>{x.face_code}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{blockById.get(x.block_id)||'—'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}>{x.material==='ore'?'Хүдэр':x.material==='waste'?'Хөрс':'Бусад'}</td><td style={{padding:12,borderBottom:'1px solid #202828',color:x.is_active?'#8cdaa7':'#f1a29a'}}>{x.is_active?'Идэвхтэй':'Идэвхгүй'}</td><td style={{padding:12,borderBottom:'1px solid #202828'}}><button onClick={()=>void toggle('mine_faces',x.id,x.is_active,x.face_code)} style={{background:'transparent',border:'1px solid #394343',borderRadius:7,color:'#dce3df',padding:'6px 9px',cursor:'pointer'}}>{x.is_active?'Идэвхгүй болгох':'Идэвхжүүлэх'}</button></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </main>
  );
}
