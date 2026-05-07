'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { startCheckout } from '@/lib/billing/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Why the user hit the wall — shown above the CTA. */
  reason?: 'compare-rent' | 'deal-limit' | 'generic';
}

const COPY: Record<NonNullable<Props['reason']>, { title: string; body: string }> = {
  'compare-rent': {
    title: 'Comparativo de aluguel é Premium',
    body: 'Avalie o aluguel justo do seu imóvel com base em anúncios do Vivareal e do Quinto Andar atualizados.',
  },
  'deal-limit': {
    title: 'Você atingiu o limite gratuito',
    body: 'O plano gratuito permite analisar até 3 imóveis. Faça upgrade para análises ilimitadas.',
  },
  generic: {
    title: 'Recurso disponível no plano Premium',
    body: 'Faça upgrade para desbloquear todas as ferramentas do ImmoYield.',
  },
};

export function UpgradeModal({ open, onOpenChange, reason = 'generic' }: Props) {
  const [loading, setLoading] = React.useState(false);
  const copy = COPY[reason];

  async function onUpgrade() {
    setLoading(true);
    try {
      await startCheckout();
    } catch (err) {
      console.error('[upgrade] checkout failed', err);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        <ul className="my-2 space-y-1.5 text-sm text-muted-foreground">
          <li>· Análises de imóveis ilimitadas</li>
          <li>· Comparativo automático de aluguel (Vivareal + Quinto Andar)</li>
          <li>· Acesso a recursos futuros sem custo extra</li>
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Agora não
          </Button>
          <Button onClick={onUpgrade} disabled={loading}>
            {loading ? 'Redirecionando…' : 'Fazer upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
