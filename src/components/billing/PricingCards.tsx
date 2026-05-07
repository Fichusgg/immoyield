'use client';

import * as React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startCheckout, openBillingPortal } from '@/lib/billing/client';
import { cn } from '@/lib/utils';

interface Props {
  currentPlan: 'free' | 'premium';
  hasStripeCustomer: boolean;
}

const FREE_FEATURES = [
  'Até 3 análises de imóveis',
  'Calculadora de rentabilidade completa',
  'Salvar e revisitar análises',
];

const PREMIUM_FEATURES = [
  'Análises de imóveis ilimitadas',
  'Comparativo automático de aluguel (Vivareal + Quinto Andar)',
  'Todos os recursos do plano gratuito',
  'Novos recursos Premium sem custo extra',
];

export function PricingCards({ currentPlan, hasStripeCustomer }: Props) {
  const [loading, setLoading] = React.useState<null | 'checkout' | 'portal'>(null);

  async function onCheckout() {
    setLoading('checkout');
    try {
      await startCheckout();
    } catch (err) {
      console.error('[pricing] checkout failed', err);
      setLoading(null);
    }
  }

  async function onPortal() {
    setLoading('portal');
    try {
      await openBillingPortal();
    } catch (err) {
      console.error('[pricing] portal failed', err);
      setLoading(null);
    }
  }

  const isPremium = currentPlan === 'premium';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card
        title="Gratuito"
        price="R$ 0"
        cadence=""
        features={FREE_FEATURES}
        cta={
          isPremium ? (
            <Button variant="outline" disabled className="w-full">
              Plano anterior
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full">
              Plano atual
            </Button>
          )
        }
      />
      <Card
        title="Premium"
        price="R$ 49"
        cadence="/mês"
        highlight
        features={PREMIUM_FEATURES}
        cta={
          isPremium ? (
            <Button
              variant="outline"
              onClick={onPortal}
              disabled={loading !== null || !hasStripeCustomer}
              className="w-full"
            >
              {loading === 'portal' ? 'Abrindo…' : 'Gerenciar assinatura'}
            </Button>
          ) : (
            <Button onClick={onCheckout} disabled={loading !== null} className="w-full">
              {loading === 'checkout' ? 'Redirecionando…' : 'Fazer upgrade'}
            </Button>
          )
        }
      />
    </div>
  );
}

interface CardProps {
  title: string;
  price: string;
  cadence: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}

function Card({ title, price, cadence, features, cta, highlight }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 shadow-sm',
        highlight && 'border-primary/40 ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-center gap-2">
        {highlight && <Sparkles className="size-4 text-primary" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
        {cadence && <span className="text-sm text-muted-foreground">{cadence}</span>}
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
