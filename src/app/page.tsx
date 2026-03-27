import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    // We are putting the client creation inside the try block now
    const supabase = await createClient();
    const { data, error } = await supabase.from('market_benchmarks').select('*').limit(3);

    // If Supabase returns an error, we throw it to the catch block
    if (error) {
      throw error;
    }

    // If everything works, show the green box
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '1.5rem', border: '2px solid #22c55e', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
          <h2 style={{ color: '#15803d', marginTop: 0 }}>Connected Successfully ✅</h2>
          <pre style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </main>
    );

  } catch (e: unknown) {
    // 1. We type 'e' as unknown to satisfy ESLint
    // 2. We safely check if it's a standard Error object before reading .message
    const errorMessage = e instanceof Error ? e.message : String(e);

    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '1.5rem', border: '2px solid #ef4444', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Server Crash Caught ❌</h2>
          <p style={{ color: '#7f1d1d' }}>The app crashed while trying to run the code. Here is the raw error message:</p>
          <pre style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {errorMessage}
          </pre>
        </div>
      </main>
    );
  }
}