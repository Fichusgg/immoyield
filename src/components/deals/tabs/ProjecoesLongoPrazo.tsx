'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';

const stepSchema = z.object({
  appreciationRate: z.number().min(0).max(50),
  incomeGrowthRate: z.number().min(0).max(50),
  expenseGrowthRate: z.number().min(0).max(50),
  holdPeriodYears: z.number().int().min(1).max(30),
  sellingCostPercent: z.number().min(0).max(20),
  depreciationPeriodYears: z.number().min(1).max(50),
});

type StepData = z.infer<typeof stepSchema>;

const fieldClass =
  'w-full border border-[#E2E0DA] bg-white px-3.5 py-2.5 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4A7C59] focus:shadow-[0_0_0_2px_rgba(74,124,89,0.12)]';
const labelClass =
  'mb-1.5 block text-[10px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase';

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function ProjecoesLongoPrazo({ onBack, onNext }: Props) {
  const { formData, updateFormData } = useDealStore();
  const proj = formData.projections;

  const { register, handleSubmit, control } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      appreciationRate: (proj?.appreciationRate ?? 0.05) * 100,
      incomeGrowthRate: (proj?.incomeGrowthRate ?? 0.05) * 100,
      expenseGrowthRate: (proj?.expenseGrowthRate ?? 0.05) * 100,
      holdPeriodYears: proj?.holdPeriodYears ?? 10,
      sellingCostPercent: (proj?.sellingCostPercent ?? 0.08) * 100,
      depreciationPeriodYears: proj?.depreciationPeriodYears ?? 25,
    },
  });

  // Live projection preview
  const purchasePrice = formData.purchasePrice ?? 0;
  const appreciation = useWatch({ control, name: 'appreciationRate' }) ?? 5;
  const holdYears = useWatch({ control, name: 'holdPeriodYears' }) ?? 10;
  const sellingCost = useWatch({ control, name: 'sellingCostPercent' }) ?? 8;
  const monthlyRent = formData.revenue?.monthlyRent ?? 0;
  const incomeGrowth = useWatch({ control, name: 'incomeGrowthRate' }) ?? 5;

  const projectedValue = purchasePrice * Math.pow(1 + appreciation / 100, holdYears);
  const netSaleProceeds = projectedValue * (1 - sellingCost / 100);
  const projectedRentYear10 = monthlyRent * Math.pow(1 + incomeGrowth / 100, holdYears);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const onSubmit = (data: StepData) => {
    updateFormData({
      projections: {
        appreciationRate: data.appreciationRate / 100,
        incomeGrowthRate: data.incomeGrowthRate / 100,
        expenseGrowthRate: data.expenseGrowthRate / 100,
        holdPeriodYears: data.holdPeriodYears,
        sellingCostPercent: data.sellingCostPercent / 100,
        depreciationPeriodYears: data.depreciationPeriodYears,
      },
    });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <h2 className="text-base font-bold text-[#1C2B20]">Projeções de Longo Prazo</h2>
        <p className="mt-0.5 text-sm text-[#9CA3AF]">
          Valorização, crescimento de receitas e horizonte de investimento.
        </p>
      </div>

      {/* Valorização e crescimento */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[#1C2B20]">Taxas de Crescimento</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Valorização do imóvel (% a.a.)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                {...register('appreciationRate', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                %
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">Histórico SP ≈ 5–7% a.a.</p>
          </div>
          <div>
            <label className={labelClass}>Crescimento da receita (% a.a.)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                {...register('incomeGrowthRate', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                %
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">
              Reajuste do aluguel (IGPM / IPCA)
            </p>
          </div>
          <div>
            <label className={labelClass}>Crescimento das despesas (% a.a.)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                {...register('expenseGrowthRate', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E2E0DA]" />

      {/* Horizonte e saída */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[#1C2B20]">Horizonte & Saída</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Período de retenção (anos)</label>
            <div className="relative">
              <input
                type="number"
                {...register('holdPeriodYears', { valueAsNumber: true })}
                className={`${fieldClass} pr-12`}
                min={1}
                max={30}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                anos
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Custo de venda (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                {...register('sellingCostPercent', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                %
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">Corretor + impostos ≈ 8%</p>
          </div>
          <div>
            <label className={labelClass}>Vida útil do imóvel (anos)</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                {...register('depreciationPeriodYears', { valueAsNumber: true })}
                className={`${fieldClass} pr-12`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                anos
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">
              Padrão Receita Federal: 25 anos
            </p>
          </div>
        </div>
      </div>

      {/* Live projection preview — only show if purchase price is set */}
      {purchasePrice > 0 && (
        <>
          <div className="border-t border-[#E2E0DA]" />
          <div>
            <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Projeção em {holdYears} {holdYears === 1 ? 'ano' : 'anos'} — prévia
            </p>
            <div className="grid grid-cols-3 gap-px border border-[#E2E0DA] bg-[#E2E0DA] text-center">
              <div className="bg-[#F0EFEB] p-4">
                <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                  Valor projetado
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold text-[#1C2B20]">
                  {fmt(projectedValue)}
                </p>
              </div>
              <div className="bg-[#F0EFEB] p-4">
                <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                  Receita líquida venda
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold text-[#4A7C59]">
                  {fmt(netSaleProceeds)}
                </p>
              </div>
              <div className="bg-[#F0EFEB] p-4">
                <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                  Aluguel no ano {holdYears}
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold text-[#1C2B20]">
                  {fmt(projectedRentYear10)}/mês
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-[#E2E0DA] px-5 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
        >
          ← Voltar
        </button>
        <button
          type="submit"
          className="bg-[#4A7C59] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          Próximo: Revisar →
        </button>
      </div>
    </form>
  );
}
