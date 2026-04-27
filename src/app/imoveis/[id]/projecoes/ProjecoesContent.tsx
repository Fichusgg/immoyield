'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, BarChart2, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SavedDeal } from '@/lib/supabase/deals';
import { calculateProjections } from '@/lib/calculations/projections';
import { analyzeRentalDeal } from '@/lib/calculations/rental';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { FormRow } from '@/components/property/FormRow';
import { NumberInput } from '@/components/property/NumberInput';
import { KpiCard } from '@/components/property/KpiCard';
import { brl, pct } from '@/components/property/format';

const DEFAULT_HOLD = 10;
const DEFAULT_APPRECIATION = 5; // %
const TABLE_YEARS = [1, 2, 3, 5, 10, 15, 20, 25, 30];

const fmtCompact = (v: number) => brl(v, { compact: true });

interface Props {
  deal: SavedDeal;
}

export default function ProjecoesContent({ deal }: Props) {
  const inp = deal.inputs;
  const m = deal.results_cache?.metrics;

  const [holdYears, setHoldYears] = React.useState<number | ''>(
    inp?.projections?.holdPeriodYears ?? DEFAULT_HOLD
  );
  const [appreciationPct, setAppreciationPct] = React.useState<number | ''>(
    (inp?.projections?.appreciationRate ?? DEFAULT_APPRECIATION / 100) * 100
  );
  const [sellingCostPct, setSellingCostPct] = React.useState<number | ''>(
    (inp?.projections?.sellingCostPercent ?? 0.06) * 100
  );

  if (!inp) {
    return (
      <>
        <PageHeader
          title="Projeções"
          breadcrumb={[
            { label: 'Imóveis', href: '/propriedades' },
            { label: deal.title, href: `/imoveis/${deal.id}/analise` },
            { label: 'Projeções' },
          ]}
        />
        <div className="border border-dashed border-[#A8C5B2] bg-[#EBF3EE] p-6 text-center">
          <p className="text-sm font-semibold text-[#1C2B20]">
            Sem dados para projetar
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Preencha a Planilha de Compra antes de gerar projeções de longo prazo.
          </p>
          <Link
            href={`/imoveis/${deal.id}/planilha`}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Abrir Planilha de Compra →
          </Link>
        </div>
      </>
    );
  }

  // ── Live projection — recompute every render ──────────────────────────────
  const yearsToProject = Math.max(
    typeof holdYears === 'number' ? holdYears : DEFAULT_HOLD,
    Math.max(...TABLE_YEARS)
  );
  const aprDecimal = (typeof appreciationPct === 'number' ? appreciationPct : DEFAULT_APPRECIATION) / 100;
  const sellingCostDecimal = (typeof sellingCostPct === 'number' ? sellingCostPct : 6) / 100;
  const baseAnalysis = analyzeRentalDeal(inp);
  const projections = calculateProjections(inp, yearsToProject, aprDecimal);

  const purchasePrice = inp.purchasePrice;
  const cashOutlay = m?.cashOutlay ?? baseAnalysis.metrics?.cashOutlay ?? 0;

  // Build chart data
  const chartData = projections.map((p) => ({
    year: `Ano ${p.year}`,
    valor: p.estimatedValue,
    equity: p.equity,
    divida: Math.max(0, p.estimatedValue - p.equity),
  }));

  // Per-year cumulative cash flow
  const monthlyCashFlow = m?.monthlyCashFlow ?? 0;
  const annualCashFlow = monthlyCashFlow * 12;

  const tableRows = TABLE_YEARS
    .filter((y) => y <= projections.length)
    .map((y) => {
      const p = projections[y - 1];
      const expectedSale = p.estimatedValue * (1 - sellingCostDecimal);
      const remainingDebt = p.estimatedValue - p.equity;
      const netSaleProceeds = expectedSale - remainingDebt;
      const totalCashCollected = annualCashFlow * y; // simple approximation
      const totalReturn = netSaleProceeds + totalCashCollected;
      const totalReturnPct =
        cashOutlay > 0 ? ((totalReturn - cashOutlay) / cashOutlay) * 100 : 0;
      return {
        year: y,
        propertyValue: p.estimatedValue,
        equity: p.equity,
        annualNoi: (p.projectedNOI ?? 0) * 12,
        annualCashFlow,
        netSaleProceeds,
        totalReturn,
        totalReturnPct,
      };
    });

  const terminalRow = tableRows[tableRows.length - 1];
  const terminalEquity = terminalRow?.equity ?? 0;
  const terminalReturn = terminalRow?.totalReturn ?? 0;
  const terminalReturnPct = terminalRow?.totalReturnPct ?? 0;

  return (
    <>
      <PageHeader
        title="Projeções"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Projeções' },
        ]}
        helper="Projete valor, equity, fluxo de caixa e retorno total ao longo do tempo. Ajuste os parâmetros abaixo para simular cenários — as mudanças não são salvas até você abrir a Planilha de Compra."
        actions={
          <>
            <Link
              href={`/imoveis/${deal.id}/planilha`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <Pencil size={12} />
              Editar Planilha
            </Link>
            <Link
              href={`/imoveis/${deal.id}/analise`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <BarChart2 size={12} />
              Análise
            </Link>
          </>
        }
      />

      {/* ── Scenario controls ──────────────────────────────────────────── */}
      <SectionHeading label="Cenário" />
      <FormCard className="mb-6">
        <FormRow label="Período de Análise">
          <NumberInput
            suffix="anos"
            value={holdYears}
            onChange={setHoldYears}
          />
        </FormRow>
        <FormRow
          label="Valorização Anual"
          help="Crescimento médio do valor do imóvel ao ano. Histórico SP/RJ: 4–7%."
        >
          <NumberInput
            decimals={2}
            suffix="% a.a."
            value={appreciationPct}
            onChange={setAppreciationPct}
          />
        </FormRow>
        <FormRow
          label="Custos de Venda"
          help="Comissão de corretagem, IR sobre ganho, certidões. Tipicamente 6–8%."
        >
          <NumberInput
            decimals={2}
            suffix="% do preço"
            value={sellingCostPct}
            onChange={setSellingCostPct}
          />
        </FormRow>
      </FormCard>

      {/* ── Terminal KPIs ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={`Valor em ${terminalRow?.year ?? '–'}a`}
          value={brl(terminalRow?.propertyValue ?? 0)}
        />
        <KpiCard label="Equity Final" value={brl(terminalEquity)} tone="positive" />
        <KpiCard label="Retorno Total" value={brl(terminalReturn)} tone="positive" />
        <KpiCard
          label="ROI Total"
          value={pct(terminalReturnPct)}
          tone={terminalReturnPct >= 0 ? 'positive' : 'negative'}
          sub={`sobre capital de ${brl(cashOutlay)}`}
        />
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <SectionHeading label="Valor do Imóvel & Equity" />
      <FormCard className="mb-6">
        <div className="h-72 px-2 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="valorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3D6B4F" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#3D6B4F" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E0DA' }}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
              />
              <YAxis
                tickFormatter={fmtCompact}
                tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div
                      className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2"
                      style={{ boxShadow: '0 10px 30px rgba(28,43,32,0.08)' }}
                    >
                      <p className="font-mono text-[10px] text-[#9CA3AF]">{label}</p>
                      {payload.map((p) => (
                        <p
                          key={p.dataKey as string}
                          className="font-mono text-xs font-semibold"
                          style={{ color: p.color }}
                        >
                          {p.name}: {brl(p.value as number)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                name="Valor do Imóvel"
                stroke="#4A7C59"
                strokeWidth={1.5}
                fill="url(#valorGrad)"
              />
              <Area
                type="monotone"
                dataKey="equity"
                name="Equity (Patrimônio Líquido)"
                stroke="#3D6B4F"
                strokeWidth={1.5}
                fill="url(#equityGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </FormCard>

      {/* ── Year-by-year table ─────────────────────────────────────────── */}
      <SectionHeading
        label="Detalhamento por Ano"
        rightSlot={
          <span className="font-mono text-[10px] text-[#9CA3AF]">
            Capital inicial: {brl(cashOutlay)}
          </span>
        }
      />
      <FormCard className="mb-6 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E0DA] bg-[#F0EFEB] text-[10px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
                <th className="px-5 py-2.5 text-left">Ano</th>
                <th className="px-3 py-2.5 text-right">Valor do Imóvel</th>
                <th className="px-3 py-2.5 text-right">Equity</th>
                <th className="px-3 py-2.5 text-right">NOI Anual</th>
                <th className="px-3 py-2.5 text-right">Fluxo Anual</th>
                <th className="px-3 py-2.5 text-right">Venda Líquida</th>
                <th className="px-3 py-2.5 text-right">Retorno Total</th>
                <th className="px-5 py-2.5 text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr
                  key={r.year}
                  className={`border-b border-[#F0EFEB] last:border-0 ${
                    i === tableRows.length - 1 ? 'bg-[#EBF3EE] font-semibold' : ''
                  }`}
                >
                  <td className="px-5 py-2.5 font-medium text-[#1C2B20]">Ano {r.year}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#1C2B20]">
                    {brl(r.propertyValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#4A7C59]">
                    {brl(r.equity)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#1C2B20]">
                    {brl(r.annualNoi)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                      r.annualCashFlow >= 0 ? 'text-[#1C2B20]' : 'text-[#DC2626]'
                    }`}
                  >
                    {brl(r.annualCashFlow)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#1C2B20]">
                    {brl(r.netSaleProceeds)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#4A7C59]">
                    {brl(r.totalReturn)}
                  </td>
                  <td
                    className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                      r.totalReturnPct >= 0 ? 'text-[#4A7C59]' : 'text-[#DC2626]'
                    }`}
                  >
                    {pct(r.totalReturnPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <p className="pb-4 text-center font-mono text-[10px] text-[#9CA3AF]">
        <TrendingUp size={10} className="-mt-0.5 mr-1 inline-block" />
        Projeção baseada em valorização constante e NOI ajustado pelo IPCA. Não considera
        eventos de mercado, vacância prolongada ou refinanciamento.
        {' '}Preço de aquisição: {brl(purchasePrice)}.
      </p>
    </>
  );
}
