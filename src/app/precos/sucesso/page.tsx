import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/layout/TopNav';
import { buttonVariants } from '@/components/ui/button';

export const metadata = {
  title: 'Upgrade concluído · ImmoYield',
};

export default async function SucessoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/precos');

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Pagamento confirmado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Em alguns segundos seu plano será ativado pelo Stripe. Se ainda
            aparecer como gratuito, recarregue a página.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/precos" className={buttonVariants({ variant: 'outline' })}>
              Ver assinatura
            </Link>
            <Link href="/propriedades" className={buttonVariants()}>
              Ir para o painel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
