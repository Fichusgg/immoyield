import DealWizard from '@/components/deals/DealWizard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
              <span className="text-xs font-black text-white">P</span>
            </div>
            <span className="font-black tracking-tight text-slate-900">ImmoYield</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              beta
            </span>
          </div>
          <span className="text-xs text-slate-400">Análise de Investimento Imobiliário</span>
        </div>
      </header>

      {/* Wizard */}
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Nova Análise</h1>
          <p className="mt-1 text-sm text-slate-500">
            Preencha os dados do imóvel para calcular o retorno sobre o investimento.
          </p>
        </div>
        <DealWizard />
      </div>
    </main>
  );
}
