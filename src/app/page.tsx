import DealWizard from '@/components/deals/DealWizard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">P</span>
            </div>
            <span className="font-black text-slate-900 tracking-tight">ImmoYield</span>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">beta</span>
          </div>
          <span className="text-xs text-slate-400">Análise de Investimento Imobiliário</span>
        </div>
      </header>

      {/* Wizard */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nova Análise</h1>
          <p className="text-sm text-slate-500 mt-1">
            Preencha os dados do imóvel para calcular o retorno sobre o investimento.
          </p>
        </div>
        <DealWizard />
      </div>
    </main>
  );
}
