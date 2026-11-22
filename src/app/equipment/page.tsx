'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, Gauge, LoaderCircle, Plus, RefreshCw, Search, Truck, Wrench, PackagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Equipment = {
  id: string;
  equipment_code: string;
  equipment_type: string;
  make_model: string | null;
  serial_number: string | null;
  is_active: boolean;
};

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#0b1010', color: '#f5f5f0',
  border: '1px solid #303939', borderRadius: 9, padding: '11px 12px', outline: 'none',
};

const starterCatalog = [
  { equipment_code: 'CAT16M-01', equipment_type: 'Автогрейдер', make_model: 'CAT 16M' },
  { equipment_code: 'CAT16M-02', equipment_type: 'Автогрейдер', make_model: 'CAT 16M' },
  { equipment_code: 'D10-01', equipment_type: 'Бульдозер', make_model: 'CAT D10' },
  { equipment_code: 'Dozer K375A', equipment_type: 'Бульдозер', make_model: 'K375A' },
  ...['830-276', '830-303', '830-304', '830-305', '830-306'].map(equipment_code => ({ equipment_code, equipment_type: 'Автосамосвал', make_model: 'Komatsu 830E' })),
  { equipment_code: 'PC3000', equipment_type: 'Экскаватор', make_model: 'Komatsu PC3000' },
  { equipment_code: 'PC4000', equipment_type: 'Экскаватор', make_model: 'Komatsu PC4000' },
  { equipment_code: '410-01', equipment_type: 'Тодорхойгүй', make_model: null },
  { equipment_code: '410-02', equipment_type: 'Тодорхойгүй', make_model: null },
  { equipment_code: 'WA-470', equipment_type: 'Дугуйт ачигч', make_model: 'Komatsu WA470' },
  { equipment_code: 'WA-900', equipment_type: 'Дугуйт ачигч', make_model: 'Komatsu WA900' },
  { equipment_code: '39-01', equipment_type: 'Тодорхойгүй', make_model: null },
];

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState('Автосамосвал');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('equipment')
      .select('id, equipment_code, equipment_type, make_model, serial_number, is_active')
      .order('equipment_code', { ascending: true });
    if (queryError) setError(queryError.message);
    else setItems((data ?? []) as Equipment[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function addOne(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('equipment').insert({
      equipment_code: code.trim(), equipment_type: kind, make_model: model.trim() || null,
      serial_number: serial.trim() || null,
    });
    if (insertError) setError(insertError.code === '23505' ? 'Энэ техникийн код өмнө бүртгэгдсэн байна.' : insertError.message);
    else { setCode(''); setModel(''); setSerial(''); setNotice('Техник амжилттай бүртгэгдлээ.'); await loadItems(); }
    setSaving(false);
  }

  async function addStarterList() {
    setSaving(true); setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); setSaving(false); return; }
    const existing = new Set(items.map(x => x.equipment_code.toUpperCase()));
    const fresh = starterCatalog.filter(x => !existing.has(x.equipment_code.toUpperCase()));
    if (!fresh.length) { setNotice('Эхний жагсаалтын бүх техник бүртгэлтэй байна.'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('equipment').insert(fresh);
    if (insertError) setError(insertError.message);
    else { setNotice(fresh.length + ' техник жагсаалтаас нэмэгдлээ. Тодорхойгүй ангилалтай 3 техникийг дараа нь засаж болно.'); await loadItems(); }
    setSaving(false);
  }

  async function toggleActive(item: Equipment) {
    setError(''); setNotice('');
    const supabase = createClient();
    if (!supabase) { setError('Supabase тохиргоо олдсонгүй.'); return; }
    const { error: updateError } = await supabase.from('equipment').update({ is_active: !item.is_active }).eq('id', item.id);
    if (updateError) setError(updateError.message);
    else { setNotice(item.equipment_code + (item.is_active ? ' идэвхгүй боллоо.' : ' идэвхжлээ.')); await loadItems(); }
  }

  const filtered = useMemo(() => items.filter(x =>
    [x.equipment_code, x.equipment_type, x.make_model, x.serial_number]
      .some(v => (v ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  ), [items, search]);

  return (
    <main style={{ minHeight: '100vh', background: '#090b0b', color: '#f5f5f0', padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <a href="/" style={{ color: '#f4c62f', textDecoration: 'none', display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 13, marginBottom: 16 }}><ArrowLeft size={15}/> Ерөнхий хяналт руу буцах</a>
            <div style={{ color: '#f4c62f', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>ҮЙЛ АЖИЛЛАГАА / ТЕХНИК</div>
            <h1 style={{ fontSize: 28, margin: '8px 0' }}>Техникийн бүртгэл</h1>
            <p style={{ color: '#899393', fontSize: 13, margin: 0 }}>Техникийн үндсэн мэдээллийг бүртгэж, идэвхтэй төлөвийг удирдана.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#f4c62f' }}><Gauge size={22}/><b>{items.length} техник</b></div>
        </header>

        {(error || notice) && <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 9, border: '1px solid '+(error ? '#7f3434' : '#376447'), background: error ? '#351b1b' : '#14251b', color: error ? '#ffb5a8' : '#a8e6bd', fontSize: 13 }}>{error || notice}</div>}

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}><PackagePlus color="#f4c62f" size={19}/><h2 style={{ fontSize: 16, margin: 0 }}>Эхний техникийн жагсаалт</h2></div>
          <p style={{ color: '#899393', fontSize: 12, marginTop: 0 }}>Өмнө өгсөн 16 техникийн кодыг автоматаар нэмнэ. Давхардсан кодыг алгасна. 410 болон 39-01-ийн төрлийг одоогоор тодорхойгүй гэж тэмдэглэнэ.</p>
          <button disabled={saving} onClick={() => void addStarterList()} style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#e4b92d', color: '#171717', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Хадгалж байна...' : 'Жагсаалтын техникийг нэмэх'}</button>
        </section>

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}><Plus color="#f4c62f" size={19}/><h2 style={{ fontSize: 16, margin: 0 }}>Шинэ техник гараар бүртгэх</h2></div>
          <form onSubmit={addOne} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Техникийн код<input style={inputStyle} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ж: CAT16M-01" required/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Техникийн төрөл<select style={inputStyle} value={kind} onChange={e=>setKind(e.target.value)}>{['Автосамосвал','Экскаватор','Бульдозер','Автогрейдер','Дугуйт ачигч','Усны машин','Туслах техник','Тодорхойгүй'].map(v=><option key={v}>{v}</option>)}</select></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Марк, модель<input style={inputStyle} value={model} onChange={e=>setModel(e.target.value)} placeholder="Ж: CAT 16M"/></label>
            <label style={{ display: 'grid', gap: 7, color: '#aeb9b6', fontSize: 12 }}>Серийн дугаар<input style={inputStyle} value={serial} onChange={e=>setSerial(e.target.value)} placeholder="Сонголтоор"/></label>
            <button disabled={saving} type="submit" style={{ height: 42, border: 0, borderRadius: 9, background: '#f4c62f', color: '#171717', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: saving ? 'wait' : 'pointer' }}>{saving ? <LoaderCircle size={16}/> : <Plus size={16}/>} Бүртгэх</button>
          </form>
        </section>

        <section style={{ background: '#111515', border: '1px solid #252d2d', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Техникийн жагсаалт</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1010', border: '1px solid #303939', borderRadius: 9, padding: '0 10px' }}><Search size={15} color="#7d8986"/><input aria-label="Хайх" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Код, төрөл, модель..." style={{ ...inputStyle, border: 0, width: 220, padding: '10px 0' }}/></div>
              <button onClick={()=>void loadItems()} style={{ border: '1px solid #303939', borderRadius: 9, padding: '9px 11px', background: '#171e1e', color: '#dce3df', cursor: 'pointer' }}><RefreshCw size={16}/></button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead><tr>{['ТЕХНИКИЙН КОД','ТӨРӨЛ','МАРК / МОДЕЛЬ','СЕРИЙН ДУГААР','ТӨЛӨВ','ҮЙЛДЭЛ'].map(h=><th key={h} style={{ textAlign: 'left', color: '#7d8986', fontSize: 10, letterSpacing: 1, padding: 12, borderBottom: '1px solid #293131' }}>{h}</th>)}</tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><LoaderCircle size={18}/> Уншиж байна...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={6} style={{ padding: 34, textAlign: 'center', color: '#899393' }}><Truck size={20}/><div style={{ marginTop: 8 }}>{items.length ? 'Хайлтад тохирох техник олдсонгүй.' : 'Одоогоор техник бүртгээгүй байна.'}</div></td></tr> :
              filtered.map(e=><tr key={e.id}>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#f4c62f', fontWeight: 700 }}>{e.equipment_code}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.equipment_type}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828' }}>{e.make_model || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828', color: '#aeb9b6' }}>{e.serial_number || '—'}</td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><span style={{ color: e.is_active ? '#8cdaa7' : '#f1a29a' }}>{e.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}</span></td>
                <td style={{ padding: 13, borderBottom: '1px solid #202828' }}><button onClick={()=>void toggleActive(e)} style={{ border: '1px solid #394343', borderRadius: 7, background: '#171e1e', color: e.is_active ? '#f1a29a' : '#8cdaa7', padding: '7px 9px', cursor: 'pointer' }}>{e.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</button></td>
              </tr>)}
            </tbody>
          </table></div>
        </section>
      </div>
    </main>
  );
}
