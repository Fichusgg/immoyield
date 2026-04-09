import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBenchmarks } from '@/lib/benchmarks';
import TopNav from '@/components/layout/TopNav';
import PropertiesPage from '@/components/properties/PropertiesPage';

export default async function PropriedadesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth?next=/propriedades');

  const benchmarks = await getBenchmarks();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <PropertiesPage benchmarks={benchmarks} />
    </div>
  );
}
