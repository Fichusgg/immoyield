import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBenchmarks } from '@/lib/benchmarks';
import TopNav from '@/components/layout/TopNav';
import PropertiesPage from '@/components/properties/PropertiesPage';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PropriedadesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Preserve any query string (e.g. `?wizard=1` from the hero calculator)
    // through the auth round-trip so the wizard opens after login.
    const params = await searchParams;
    const qs = Object.entries(params)
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
      .join('&');
    const next = `/propriedades${qs ? `?${qs}` : ''}`;
    redirect(`/auth?next=${encodeURIComponent(next)}`);
  }

  const benchmarks = await getBenchmarks();

  return (
    <div className="flex h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <PropertiesPage benchmarks={benchmarks} />
    </div>
  );
}
