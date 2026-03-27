import { createClient } from '@/lib/supabase/server';

// Force Vercel to fetch fresh data on every page load
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('market_benchmarks').select('*').limit(3);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Supabase Connection Test</h1>
      
      {error ? (
        <div style={{ padding: '1.5rem', border: '2px solid #ef4444', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Connection Failed ❌</h2>
          <p style={{ color: '#7f1d1d' }}>Vercel has your keys, but Supabase rejected the request. Here is why:</p>
          <pre style={{ overflowX: 'auto', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '4px' }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', border: '2px solid #22c55e', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
          <h2 style={{ color: '#15803d', marginTop: 0 }}>Connected Successfully ✅</h2>
          <p style={{ color: '#166534' }}>Vercel successfully talked to your Supabase database! Here is a sample of your data:</p>
          <pre style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}