// Force Vercel to load this dynamically so we get real-time env variables
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Safely grab the variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Create safe boolean checks (true/false) instead of the actual strings
  const hasUrl = !!supabaseUrl;
  const hasAnonKey = !!supabaseAnonKey;

  // Optional: Get the length to ensure they aren't accidentally empty strings or cut off
  const urlLength = supabaseUrl ? supabaseUrl.length : 0;
  const keyLength = supabaseAnonKey ? supabaseAnonKey.length : 0;

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Environment Variable Security Check</h1>
      <p style={{ color: '#555' }}>
        This page safely checks if Vercel can see your secrets without printing them.
      </p>

      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Supabase URL</h3>
        <p>
          Status: {hasUrl ? <span style={{ color: 'green' }}>Detected ✅</span> : <span style={{ color: 'red' }}>Missing ❌</span>}
        </p>
        <p>Length: {urlLength} characters</p>
      </div>

      <div style={{ marginTop: '1rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Supabase Anon Key</h3>
        <p>
          Status: {hasAnonKey ? <span style={{ color: 'green' }}>Detected ✅</span> : <span style={{ color: 'red' }}>Missing ❌</span>}
        </p>
        <p>Length: {keyLength} characters</p>
      </div>

      {!hasUrl || !hasAnonKey ? (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>
          <strong>Action Required:</strong> Your variables are missing on Vercel. You need to add them to your Project Settings and Redeploy.
        </div>
      ) : (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '6px' }}>
          <strong>All good!</strong> Vercel sees your variables. If your app is still breaking, the issue is likely with your database permissions or network settings, not the environment variables.
        </div>
      )}
    </main>
  );
}