import DealWizard from '@/components/deals/DealWizard';
import AppLayout from '@/components/layout/AppLayout';
import { getBenchmarks } from '@/lib/benchmarks';
import { createClient } from '@/lib/supabase/server';
import { PROPERTY_TYPES, PropertyType } from '@/lib/validations/deal';

export default async function AnalisarPage() {
  const benchmarks = await getBenchmarks();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dealCounts: Record<PropertyType, number> | undefined;
  if (user) {
    const { data: dealData } = await supabase
      .from('deals')
      .select('property_type')
      .eq('user_id', user.id);

    dealCounts = PROPERTY_TYPES.reduce(
      (acc, type) => {
        acc[type] = (dealData ?? []).filter((d) => d.property_type === type).length;
        return acc;
      },
      {} as Record<PropertyType, number>
    );
  }

  return (
    <AppLayout userEmail={user?.email} dealCounts={dealCounts}>
      <DealWizard benchmarks={benchmarks} />
    </AppLayout>
  );
}
