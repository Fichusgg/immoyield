import DealWizard from '@/components/deals/DealWizard';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getBenchmarks } from '@/lib/benchmarks';
import { createClient } from '@/lib/supabase/server';

export default async function AnalisarPage() {
  const benchmarks = await getBenchmarks();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SidebarLayout userEmail={user?.email}>
      <DealWizard benchmarks={benchmarks} />
    </SidebarLayout>
  );
}
