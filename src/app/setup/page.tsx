export default function SetupPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090b0b', color: '#f5f5f0', padding: 24 }}>
      <section style={{ maxWidth: 520, border: '1px solid #343b35', borderRadius: 16, background: '#111515', padding: 28 }}>
        <h1 style={{ color: '#f4c62f', fontSize: 22 }}>MINE CONTROL тохиргоо дутуу байна</h1>
        <p style={{ color: '#b6c0ba', lineHeight: 1.7 }}>Supabase URL эсвэл Publishable key олдсонгүй. Vercel → Project Settings → Environment Variables хэсэгт NEXT_PUBLIC_SUPABASE_URL болон NEXT_PUBLIC_SUPABASE_ANON_KEY утгуудыг Production, Preview, Development орчинд тохируулаад дахин Deploy хийнэ үү.</p>
      </section>
    </main>
  );
}
