'use client';

import * as React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startCheckout } from '@/lib/billing/client';

export function CompareRentLocked() {
  const [loading, setLoading] = React.useState(false);

  async function onUpgrade() {
    setLoading(true);
    try {
      await startCheckout();
    } catch (err) {
      console.error('[locked] checkout failed', err);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-primary/30 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-5 text-primary" />
      </div>
      <h2 className="mt-4 flex items-center justify-center gap-2 text-xl font-semibold">
        <Sparkles className="size-4 text-primary" />
        Comparativo de aluguel é Premium
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Encontre o aluguel justo do seu imóvel com base em anúncios reais do
        Vivareal e do Quinto Andar. Esse recurso está disponível no plano Premium.
      </p>
      <div className="mt-6">
        <Button onClick={onUpgrade} disabled={loading}>
          {loading ? 'Redirecionando…' : 'Fazer upgrade'}
        </Button>
      </div>
    </div>
  );
}
