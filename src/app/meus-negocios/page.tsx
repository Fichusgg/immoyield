import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DealList from '@/components/dashboard/DealList';
import AppLayout from '@/components/layout/AppLayout';
import { PROPERTY_TYPES, PropertyType } from '@/lib/validations/deal';

export default async function MeusNegociosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth?next=/meus-negocios');

  // Query deal counts per property type for the sidebar
  const { data: dealData } = await supabase
    .from('deals')
    .select('property_type')
    .eq('user_id', user.id);

  const dealCounts = PROPERTY_TYPES.reduce(
    (acc, type) => {
      acc[type] = (dealData ?? []).filter((d) => d.property_type === type).length;
      return acc;
    },
    {} as Record<PropertyType, number>
  );

  return (
    <AppLayout userEmail={user.email} dealCounts={dealCounts}>
      <DealList />
    </AppLayout>
  );
}
