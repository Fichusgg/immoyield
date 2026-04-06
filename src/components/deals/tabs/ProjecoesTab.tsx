'use client';

import { useDealStore } from '@/store/useDealStore';

interface Props {
  onBack: () => void;
  onCalculate: () => void;
  loading: boolean;
  apiError: string | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ProjecoesTab({ onBack, onCalculate, loading, apiError }: Props) {
  const { formData } = useDealStore();
  const isReforma = formData.propertyType === 'flip';
  const isAirbnb = formData.propertyType === 'airbnb';
  const proj = formData.projections;

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-base font-bold text-[#f4f4f5]">Revisar & Calcular</h2>
        <p className="mt-0.5 text-sm text-[#52525b]">
          Confirme os dados antes de rodar a análise completa.
        </p>
      </div>

      {/* Summary table */}
      <div className="divide-y divide-[#27272a] border border-[#27272a] text-sm">
        {/* Dados do imóvel */}
        <SectionHeader label="Dados do Imóvel" />
        {[
          { label: 'Nome', value: formData.name ?? '—' },
          { label: 'Tipo', value: formData.propertyType ?? '—' },
          { label: 'Valor de compra', value: fmt(formData.purchasePrice ?? 0) },
        ].map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}

        {/* Aquisição */}
        <SectionHeader label="Compra & Custos" />
        {[
          { label: 'ITBI', value: pct(formData.acquisitionCosts?.itbiPercent ?? 0) },
          { label: 'Cartório', value: fmt(formData.acquisitionCosts?.cartorio ?? 0) },
          { label: 'Reformas / benfeitorias', value: fmt(formData.acquisitionCosts?.reforms ?? 0) },
          {
            label: 'Financiamento',
            value: formData.financing?.enabled
              ? `${formData.financing.system} · ${formData.financing.interestRateYear}% a.a. · ${formData.financing.termMonths} meses`
              : 'À vista',
          },
        ].map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}

        {/* Receitas */}
        <SectionHeader label="Receitas & Despesas" />
        {isReforma
          ? [
              { label: 'ARV (pós-reforma)', value: fmt(formData.revenue?.afterRepairValue ?? 0) },
              { label: 'Prazo de reforma', value: `${formData.revenue?.holdingMonths ?? 6} meses` },
              {
                label: 'Custo de venda',
                value: pct(formData.expenses?.sellingCostPercent ?? 0.06),
              },
            ].map((r) => <Row key={r.label} label={r.label} value={r.value} />)
          : isAirbnb
            ? [
                { label: 'Diária média', value: fmt(formData.revenue?.dailyRate ?? 0) },
                { label: 'Taxa de ocupação', value: pct(formData.revenue?.occupancyRate ?? 0.65) },
              ].map((r) => <Row key={r.label} label={r.label} value={r.value} />)
            : [
                { label: 'Aluguel mensal', value: fmt(formData.revenue?.monthlyRent ?? 0) },
                { label: 'Vacância', value: pct(formData.revenue?.vacancyRate ?? 0.05) },
                {
                  label: 'Reajuste IPCA',
                  value: formData.revenue?.ipcaIndexed
                    ? `Sim — ${pct(formData.revenue.annualIpcaRate ?? 0.05)} a.a.`
                    : 'Não',
                },
                { label: 'Condomínio', value: fmt(formData.expenses?.condo ?? 0) },
                { label: 'IPTU', value: fmt(formData.expenses?.iptu ?? 0) },
              ].map((r) => <Row key={r.label} label={r.label} value={r.value} />)}

        {/* Projeções de Longo Prazo */}
        {proj && (
          <>
            <SectionHeader label="Projeções de Longo Prazo" />
            {[
              {
                label: 'Valorização anual',
                value: pct(proj.appreciationRate ?? 0.05),
              },
              {
                label: 'Crescimento da receita',
                value: pct(proj.incomeGrowthRate ?? 0.05),
              },
              {
                label: 'Crescimento das despesas',
                value: pct(proj.expenseGrowthRate ?? 0.05),
              },
              {
                label: 'Período de retenção',
                value: `${proj.holdPeriodYears ?? 10} anos`,
              },
              {
                label: 'Custo de venda',
                value: pct(proj.sellingCostPercent ?? 0.08),
              },
              {
                label: 'Vida útil (depreciação)',
                value: `${proj.depreciationPeriodYears ?? 25} anos`,
              },
            ].map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </>
        )}
      </div>

      {apiError && (
        <p className="border border-[#7f1d1d] bg-[#450a0a] px-4 py-3 font-mono text-sm text-[#f87171]">
          {apiError}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-[#27272a] px-5 py-2.5 text-sm font-medium text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa]"
        >
          ← Voltar
        </button>
        <button
          onClick={onCalculate}
          disabled={loading}
          className="bg-[#22c55e] px-8 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#16a34a] disabled:opacity-50"
        >
          {loading ? 'Calculando...' : 'Rodar Análise →'}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="bg-[#0a0a0a] px-4 py-2.5">
      <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
        {label}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between bg-[#111111] px-4 py-3">
      <span className="text-[#52525b]">{label}</span>
      <span className="font-mono font-semibold text-[#f4f4f5]">{value}</span>
    </div>
  );
}
