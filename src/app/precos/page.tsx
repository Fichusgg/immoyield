import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserEntitlement } from '@/lib/entitlements';
import TopNav from '@/components/layout/TopNav';
import { PricingCards } from '@/components/billing/PricingCards';

export const metadata = {
  title: 'Planos · ImmoYield',
};

export default async function PrecosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/precos');

  const ent = await getUserEntitlement(supabase, user.id);
  const currentPlan = ent?.plan ?? 'free';
  const hasStripeCustomer = Boolean(ent?.stripe_customer_id);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-10">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Planos</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha o plano que faz sentido para o seu volume de análises.
            </p>
          </header>
          <PricingCards currentPlan={currentPlan} hasStripeCustomer={hasStripeCustomer} />
        </div>
      </main>
    </div>
  );
}
