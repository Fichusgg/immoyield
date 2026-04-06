'use client';

import { useMemo, useState } from 'react';

import { AddDealSidebar, type DealType } from '@/components/deals/add-deal/Sidebar';
import { AddDealWizard } from '@/components/deals/add-deal/Wizard';

export default function NewDealPage() {
  const [dealType, setDealType] = useState<DealType>('rentals');

  const title = useMemo(() => {
    switch (dealType) {
      case 'rentals':
        return { h1: 'Novo Imóvel para Aluguel', crumb: 'Aluguéis / Novo Imóvel' };
      case 'brrrrs':
        return { h1: 'Novo Imóvel BRRRR', crumb: 'BRRRRs / Novo Imóvel' };
      case 'flips':
        return { h1: 'Novo Projeto de Reforma', crumb: 'Reforma e Venda / Novo Imóvel' };
      case 'wholesale':
        return { h1: 'Novo Negócio Atacado', crumb: 'Atacado / Novo Imóvel' };
    }
  }, [dealType]);

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Top navbar (placeholder) */}
      <header className="sticky top-0 z-20 h-14 border-b border-[#e5e5e3] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600" />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-[#1a1a1a]">ImmoYield</p>
              <p className="text-[10px] font-medium text-[#a3a3a1]">Análise Imobiliária</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#efefed]" />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex max-w-[1440px] gap-6 px-6 py-8">
        <aside className="w-[320px] shrink-0">
          <AddDealSidebar activeType={dealType} onTypeChange={setDealType} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1040px]">
            <AddDealWizard dealType={dealType} pageTitle={title.h1} breadcrumb={title.crumb} />
          </div>
        </main>
      </div>
    </div>
  );
}

