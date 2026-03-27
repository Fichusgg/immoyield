import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('market_benchmarks').select('*');

  return <pre>{error ? JSON.stringify(error) : JSON.stringify(data)}</pre>;
}
