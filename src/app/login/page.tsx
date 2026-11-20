'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mountain } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase тохиргоо олдсонгүй. Environment Variables-ийг шалгана уу.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нэвтрэхэд алдаа гарлаа.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090b0b', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 420, border: '1px solid #252b2b', borderRadius: 18, background: '#111515', padding: 32, color: '#f5f5f0', boxShadow: '0 24px 80px #0008' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f4c62f', color: '#101212', display: 'grid', placeItems: 'center' }}><Mountain size={25}/></div>
          <div><div style={{ fontWeight: 900, letterSpacing: 1 }}>MINE<span style={{ color: '#f4c62f' }}>CONTROL</span></div><div style={{ color: '#859090', fontSize: 10, letterSpacing: 2 }}>MINING OPERATIONS</div></div>
        </div>
        <div style={{ color: '#f4c62f', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>АЖИЛТНЫ НЭВТРЭЛТ</div>
        <h1 style={{ fontSize: 27, margin: '9px 0 8px' }}>Системд нэвтрэх</h1>
        <p style={{ color: '#899393', fontSize: 13, marginBottom: 26 }}>Бүртгэлтэй ажлын имэйл, нууц үгээ оруулна уу.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 15 }}>
          <label style={{ display: 'grid', gap: 7, fontSize: 12, color: '#c6ceca' }}>И-мэйл
            <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.mn" style={fieldStyle}/>
          </label>
          <label style={{ display: 'grid', gap: 7, fontSize: 12, color: '#c6ceca' }}>Нууц үг
            <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={fieldStyle}/>
          </label>
          {error && <div role="alert" style={{ border: '1px solid #7f3434', background: '#351b1b', color: '#ffb5a8', padding: 11, borderRadius: 9, fontSize: 12 }}>{error}</div>}
          <button disabled={busy} type="submit" style={{ border: 0, borderRadius: 9, padding: '13px 16px', marginTop: 5, background: busy ? '#9b8127' : '#f4c62f', color: '#171717', fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#697474', fontSize: 11, marginTop: 22 }}><LockKeyhole size={13}/> Эрхийн түвшингээр хамгаалагдсан систем</div>
      </section>
    </main>
  );
}

const fieldStyle = {
  width: '100%', boxSizing: 'border-box' as const, border: '1px solid #303939',
  borderRadius: 9, background: '#0b1010', color: '#f5f5f0', padding: '12px 13px',
  outline: 'none', fontSize: 14,
};
