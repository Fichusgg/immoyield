'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  simulateFinancing,
  type FinancingScenario,
  type FinancingSimulationResult,
} from '@/lib/calculations/financing';
import type { AmortizationSystem, FinancingModality } from '@/lib/calculations/types';

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number, d = 2) => `${v.toFixed(d)}%`;

// ── DSCR Badge ────────────────────────────────────────────────────────────────

function DscrBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#737373]">—</span>;
  const good = value >= 1.3;
  const ok = value >= 1.1;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        good
          ? 'bg-[#ebf3ee] text-[#1a5c3a]'
          : ok
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-red-50 text-red-600'
      }`}
    >
      {value.toFixed(2)}
      <span className="font-normal">{good ? '· Bom' : ok ? '· Ok' : '· Baixo'}</span>
    </span>
  );
}

// ── Chart sample helper ───────────────────────────────────────────────────────

function sampleSchedule(result: FinancingSimulationResult) {
  if (result.schedule.length === 0) return [];
  const checkpoints = [1, 12, 24, 36, 60, 84, 120, 180, 240, 300, 360];
  const validMonths = checkpoints.filter((m) => m <= result.schedule.length);
  const last = result.schedule.length;
  if (!validMonths.includes(last)) validMonths.push(last);
  return validMonths.map((m) => {
    const period = result.schedule[m - 1];
    return {
      month: m,
      label: m === 1 ? 'Mês 1' : `Ano ${Math.ceil(m / 12)}`,
      installment: period.installment,
      noi: result.monthlyNOI != null ? result.monthlyNOI : undefined,
    };
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FinanciamentoTabProps {
  purchasePrice: number;
  acquisitionCosts: number;
  /** Full breakdown from the actual saved deal analysis */
  actualAnalysis: {
    grossMonthlyRent: number;
    vacancyLoss: number;
    effectiveRent: number;
    operatingExpenses: number;
    monthlyNOI: number;
    firstInstallment: number;
    monthlyCashFlow: number;
    loanAmount: number;
    ltv: number;
    dscr: number | null;
    cashOnCash: number;
    paybackYears: number | null;
  };
  /** Default values to pre-fill the simulator */
  defaults: {
    monthlyRent: number;
    vacancyRate: number; // 0–1
    condo: number;
    iptu: number;
    managementPercent: number; // 0–1
    maintenancePercent: number; // 0–1
    downPayment: number;
    interestRateYear: number;
    termMonths: number;
    system: AmortizationSystem;
    modality?: FinancingModality;
  };
}

type TabMode = 'analise' | 'simulador';

// ── Simulator state ───────────────────────────────────────────────────────────

interface SimState {
  monthlyRent: number;
  vacancyRate: number; // 0–100 displayed
  condo: number;
  iptu: number;
  managementPercent: number; // 0–100 displayed
  maintenancePercent: number; // 0–100 displayed
  downPayment: number;
  interestRateYear: number;
  termMonths: number;
  system: AmortizationSystem;
  modality?: FinancingModality;
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinanciamentoTab({
  purchasePrice,
  acquisitionCosts,
  actualAnalysis,
  defaults,
}: FinanciamentoTabProps) {
  const [mode, setMode] = useState<TabMode>('analise');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedulePage, setSchedulePage] = useState(0);

  // Simulator state — starts pre-filled from defaults
  const [sim, setSim] = useState<SimState>({
    monthlyRent: defaults.monthlyRent,
    vacancyRate: defaults.vacancyRate * 100,
    condo: defaults.condo,
    iptu: defaults.iptu,
    managementPercent: defaults.managementPercent * 100,
    maintenancePercent: defaults.maintenancePercent * 100,
    downPayment: defaults.downPayment,
    interestRateYear: defaults.interestRateYear,
    termMonths: defaults.termMonths,
    system: defaults.system,
    modality: defaults.modality,
  });

  // Compute simulator NOI from overrides
  const simNOI = useMemo(() => {
    const vacancy = sim.monthlyRent * (sim.vacancyRate / 100);
    const effective = sim.monthlyRent - vacancy;
    const mgmt = effective * (sim.managementPercent / 100);
    const maint = effective * (sim.maintenancePercent / 100);
    const opEx = sim.condo + sim.iptu + mgmt + maint;
    return effective - opEx;
  }, [sim]);

  const simOpEx = useMemo(() => {
    const vacancy = sim.monthlyRent * (sim.vacancyRate / 100);
    const effective = sim.monthlyRent - vacancy;
    const mgmt = effective * (sim.managementPercent / 100);
    const maint = effective * (sim.maintenancePercent / 100);
    return sim.condo + sim.iptu + mgmt + maint;
  }, [sim]);

  const simScenario: FinancingScenario = useMemo(
    () => ({
      id: 'sim',
      label: 'Simulador',
      purchasePrice,
      downPayment: sim.downPayment,
      interestRateYear: sim.interestRateYear,
      termMonths: Math.max(1, sim.termMonths),
      system: sim.system,
      modality: sim.modality,
    }),
    [purchasePrice, sim]
  );

  const simResult = useMemo(
    () => simulateFinancing(simScenario, simNOI, simOpEx, acquisitionCosts),
    [simScenario, simNOI, simOpEx, acquisitionCosts]
  );

  // Build an AnaliseResult-shaped object for the Análise tab chart
  const analiseResult = useMemo(() => {
    const scenario: FinancingScenario = {
      id: 'analise',
      label: 'Atual',
      purchasePrice,
      downPayment: purchasePrice - actualAnalysis.loanAmount,
      interestRateYear: defaults.interestRateYear,
      termMonths: defaults.termMonths,
      system: defaults.system,
      modality: defaults.modality,
    };
    return simulateFinancing(
      scenario,
      actualAnalysis.monthlyNOI,
      actualAnalysis.operatingExpenses,
      acquisitionCosts
    );
  }, [purchasePrice, actualAnalysis, defaults, acquisitionCosts]);

  const activeResult = mode === 'analise' ? analiseResult : simResult;
  const chartData = useMemo(() => sampleSchedule(activeResult), [activeResult]);

  const ROWS_PER_PAGE = 24;
  const totalPages = Math.ceil(activeResult.schedule.length / ROWS_PER_PAGE);
  const scheduleSlice = activeResult.schedule.slice(
    schedulePage * ROWS_PER_PAGE,
    (schedulePage + 1) * ROWS_PER_PAGE
  );

  function patchSim(patch: Partial<SimState>) {
    setSim((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex w-fit gap-1 rounded-lg bg-[#f5f5f3] p-1">
        {(['analise', 'simulador'] as TabMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setSchedulePage(0);
              setShowSchedule(false);
            }}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              mode === m
                ? 'bg-white text-[#1c2b20] shadow-sm'
                : 'text-[#737373] hover:text-[#1c2b20]'
            }`}
          >
            {m === 'analise' ? 'Análise' : 'Simulador'}
          </button>
        ))}
      </div>

      {/* ── ANÁLISE MODE ────────────────────────────────────────────────── */}
      {mode === 'analise' && (
        <>
          {/* Waterfall + KPIs */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Waterfall */}
            <div className="divide-y divide-[#f5f5f3] rounded-xl border border-[#e5e5e3] bg-white">
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
                  Fluxo Mensal
                </p>
              </div>
              <div className="space-y-2.5 px-5 py-4 text-xs">
                <WaterfallRow label="Aluguel Bruto" value={actualAnalysis.grossMonthlyRent} />
                <WaterfallRow label="(−) Vacância" value={-actualAnalysis.vacancyLoss} muted />
                <WaterfallRow label="Renda Efetiva" value={actualAnalysis.effectiveRent} bold />
                <WaterfallRow
                  label="(−) Despesas Operacionais"
                  value={-actualAnalysis.operatingExpenses}
                  muted
                />
                <WaterfallRow label="NOI" value={actualAnalysis.monthlyNOI} bold />
                {actualAnalysis.firstInstallment > 0 && (
                  <WaterfallRow
                    label="(−) Parcela"
                    value={-actualAnalysis.firstInstallment}
                    muted
                  />
                )}
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1c2b20]">Fluxo de Caixa</span>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${actualAnalysis.monthlyCashFlow >= 0 ? 'text-[#1a5c3a]' : 'text-red-600'}`}
                    >
                      {fmt(actualAnalysis.monthlyCashFlow)}/mês
                    </p>
                    <p className="text-xs text-[#737373]">
                      {fmt(actualAnalysis.monthlyCashFlow * 12)}/ano
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-3 rounded-lg px-3 py-2.5 ${actualAnalysis.monthlyCashFlow >= 0 ? 'bg-[#ebf3ee]' : 'bg-red-50'}`}
                >
                  <p
                    className={`text-xs font-bold ${actualAnalysis.monthlyCashFlow >= 0 ? 'text-[#1a5c3a]' : 'text-red-600'}`}
                  >
                    {actualAnalysis.monthlyCashFlow >= 0 ? '✅ LUCRATIVO' : '❌ NÃO LUCRATIVO'}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${actualAnalysis.monthlyCashFlow >= 0 ? 'text-[#2d7a4f]' : 'text-red-500'}`}
                  >
                    {actualAnalysis.monthlyCashFlow >= 0
                      ? `Sobra ${fmt(actualAnalysis.monthlyCashFlow)}/mês após a parcela`
                      : `Falta ${fmt(Math.abs(actualAnalysis.monthlyCashFlow))}/mês para cobrir`}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI grid + loan details */}
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <KpiTile label="DSCR">
                  <DscrBadge value={actualAnalysis.dscr} />
                </KpiTile>
                <KpiTile label="LTV">
                  <span
                    className={`text-lg font-bold ${actualAnalysis.ltv <= 70 ? 'text-[#1a5c3a]' : actualAnalysis.ltv <= 80 ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    {fmtPct(actualAnalysis.ltv)}
                  </span>
                </KpiTile>
                <KpiTile label="Cash-on-Cash">
                  <span
                    className={`text-lg font-bold ${actualAnalysis.cashOnCash >= 6 ? 'text-[#1a5c3a]' : actualAnalysis.cashOnCash >= 4 ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    {fmtPct(actualAnalysis.cashOnCash)} a.a.
                  </span>
                </KpiTile>
                <KpiTile label="Payback entrada">
                  <span className="text-lg font-bold text-[#1c2b20]">
                    {actualAnalysis.paybackYears !== null
                      ? `${actualAnalysis.paybackYears.toFixed(1)} anos`
                      : '—'}
                  </span>
                </KpiTile>
              </div>

              {/* Loan details */}
              <div className="space-y-2.5 rounded-xl border border-[#e5e5e3] bg-white p-5">
                <p className="text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
                  Financiamento
                </p>
                <MetricRow label="Valor financiado" value={fmt(actualAnalysis.loanAmount)} />
                <MetricRow
                  label="Parcela mês 1"
                  value={`${fmt(actualAnalysis.firstInstallment)}/mês`}
                />
                {analiseResult.lastInstallment !== analiseResult.firstInstallment && (
                  <MetricRow
                    label="Parcela final"
                    value={`${fmt(analiseResult.lastInstallment)}/mês`}
                  />
                )}
                <MetricRow label="Total de parcelas" value={fmt(analiseResult.totalPaid)} />
                <MetricRow
                  label="Total de juros"
                  value={`${fmt(analiseResult.totalInterest)} (${fmtPct(analiseResult.totalInterestPercent)})`}
                  highlight="red"
                />
                <MetricRow
                  label="Aluguel break-even"
                  value={`${fmt(analiseResult.breakEvenRent)}/mês`}
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <InstallmentChart chartData={chartData} monthlyNOI={actualAnalysis.monthlyNOI} />

          {/* Amortization table */}
          <AmortizationTable
            show={showSchedule}
            onToggle={() => setShowSchedule(!showSchedule)}
            scheduleSlice={scheduleSlice}
            schedulePage={schedulePage}
            totalPages={totalPages}
            totalRows={activeResult.schedule.length}
            rowsPerPage={ROWS_PER_PAGE}
            onPageChange={setSchedulePage}
          />
        </>
      )}

      {/* ── SIMULADOR MODE ──────────────────────────────────────────────── */}
      {mode === 'simulador' && (
        <>
          <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
            {/* Left — full inputs */}
            <div className="space-y-4">
              {/* Revenue */}
              <InputSection title="Receitas">
                <FieldRow label="Aluguel mensal">
                  <CurrencyInput
                    value={sim.monthlyRent}
                    onValueChange={(v) => patchSim({ monthlyRent: v ?? sim.monthlyRent })}
                    placeholder="0"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label={`Vacância — ${sim.vacancyRate.toFixed(1)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={0.5}
                    value={sim.vacancyRate}
                    onChange={(e) => patchSim({ vacancyRate: parseFloat(e.target.value) })}
                    className="w-full accent-[#1a5c3a]"
                  />
                  <p className="mt-1 text-[11px] text-[#a3a3a1]">
                    Perda: {fmt((sim.monthlyRent * sim.vacancyRate) / 100)}/mês
                  </p>
                </FieldRow>
              </InputSection>

              {/* Expenses */}
              <InputSection title="Despesas">
                <FieldRow label="Condomínio">
                  <CurrencyInput
                    value={sim.condo}
                    onValueChange={(v) => patchSim({ condo: v ?? sim.condo })}
                    placeholder="0"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label="IPTU (mensal)">
                  <CurrencyInput
                    value={sim.iptu}
                    onValueChange={(v) => patchSim({ iptu: v ?? sim.iptu })}
                    placeholder="0"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label={`Gestão — ${sim.managementPercent.toFixed(1)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={sim.managementPercent}
                    onChange={(e) => patchSim({ managementPercent: parseFloat(e.target.value) })}
                    className="w-full accent-[#1a5c3a]"
                  />
                  <p className="mt-1 text-[11px] text-[#a3a3a1]">
                    {fmt(
                      sim.monthlyRent * (1 - sim.vacancyRate / 100) * (sim.managementPercent / 100)
                    )}
                    /mês
                  </p>
                </FieldRow>
                <FieldRow label={`Manutenção — ${sim.maintenancePercent.toFixed(1)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={sim.maintenancePercent}
                    onChange={(e) => patchSim({ maintenancePercent: parseFloat(e.target.value) })}
                    className="w-full accent-[#1a5c3a]"
                  />
                  <p className="mt-1 text-[11px] text-[#a3a3a1]">
                    {fmt(
                      sim.monthlyRent * (1 - sim.vacancyRate / 100) * (sim.maintenancePercent / 100)
                    )}
                    /mês
                  </p>
                </FieldRow>
                <div className="mt-2 flex justify-between rounded-lg bg-[#f5f5f3] px-3 py-2 text-xs">
                  <span className="text-[#737373]">Total despesas</span>
                  <span className="font-bold text-[#1c2b20]">{fmt(simOpEx)}/mês</span>
                </div>
              </InputSection>

              {/* Financing */}
              <InputSection title="Financiamento">
                <FieldRow label="Entrada (R$)">
                  <CurrencyInput
                    value={sim.downPayment}
                    onValueChange={(v) => patchSim({ downPayment: v ?? sim.downPayment })}
                    placeholder="0"
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-[#a3a3a1]">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        (sim.downPayment / purchasePrice) * 100 >= 20
                          ? 'bg-[#ebf3ee] text-[#1a5c3a]'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {purchasePrice > 0
                        ? ((sim.downPayment / purchasePrice) * 100).toFixed(1)
                        : '0'}
                      % do imóvel
                    </span>
                  </p>
                </FieldRow>
                <FieldRow label="Taxa (% a.a.)">
                  <input
                    type="number"
                    value={sim.interestRateYear}
                    onChange={(e) =>
                      patchSim({ interestRateYear: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    step="0.1"
                    min="0"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label="Prazo (meses)">
                  <input
                    type="number"
                    value={sim.termMonths}
                    onChange={(e) =>
                      patchSim({ termMonths: Math.max(12, parseInt(e.target.value) || 12) })
                    }
                    step="12"
                    min="12"
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-[#a3a3a1]">
                    = {Math.floor(Math.max(1, sim.termMonths) / 12)} anos
                  </p>
                </FieldRow>
                <FieldRow label="Sistema">
                  <div className="flex gap-1.5">
                    {(['SAC', 'PRICE'] as AmortizationSystem[]).map((sys) => (
                      <button
                        key={sys}
                        type="button"
                        onClick={() => patchSim({ system: sys })}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          sim.system === sys
                            ? 'border-[#1a5c3a] bg-[#ebf3ee] text-[#1a5c3a]'
                            : 'border-[#e5e5e3] text-[#737373] hover:bg-[#f5f5f3]'
                        }`}
                      >
                        {sys}
                      </button>
                    ))}
                  </div>
                </FieldRow>
                <FieldRow label="Modalidade">
                  <div className="flex flex-wrap gap-1.5">
                    {(['SFH', 'SFI', 'consorcio', 'outro'] as FinancingModality[]).map((mod) => {
                      const labels: Record<string, string> = {
                        SFH: 'SFH',
                        SFI: 'SFI',
                        consorcio: 'Consórcio',
                        outro: 'Outro',
                      };
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => patchSim({ modality: mod })}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            sim.modality === mod
                              ? 'border-[#1a5c3a] bg-[#ebf3ee] text-[#1a5c3a]'
                              : 'border-[#e5e5e3] text-[#737373] hover:bg-[#f5f5f3]'
                          }`}
                        >
                          {labels[mod]}
                        </button>
                      );
                    })}
                  </div>
                </FieldRow>
              </InputSection>

              {/* Reset button */}
              <button
                type="button"
                onClick={() =>
                  setSim({
                    monthlyRent: defaults.monthlyRent,
                    vacancyRate: defaults.vacancyRate * 100,
                    condo: defaults.condo,
                    iptu: defaults.iptu,
                    managementPercent: defaults.managementPercent * 100,
                    maintenancePercent: defaults.maintenancePercent * 100,
                    downPayment: defaults.downPayment,
                    interestRateYear: defaults.interestRateYear,
                    termMonths: defaults.termMonths,
                    system: defaults.system,
                    modality: defaults.modality,
                  })
                }
                className="w-full rounded-lg border border-[#e5e5e3] py-2 text-xs font-medium text-[#737373] transition-colors hover:bg-[#f5f5f3]"
              >
                Restaurar valores originais
              </button>
            </div>

            {/* Right — Live results */}
            <SimResultCard result={simResult} simNOI={simNOI} simOpEx={simOpEx} simState={sim} />
          </div>

          {/* Chart */}
          <InstallmentChart chartData={chartData} monthlyNOI={simNOI} />

          {/* Amortization table */}
          <AmortizationTable
            show={showSchedule}
            onToggle={() => setShowSchedule(!showSchedule)}
            scheduleSlice={scheduleSlice}
            schedulePage={schedulePage}
            totalPages={totalPages}
            totalRows={activeResult.schedule.length}
            rowsPerPage={ROWS_PER_PAGE}
            onPageChange={setSchedulePage}
          />
        </>
      )}
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-[#e5e5e3] px-3 py-2 text-sm text-[#1c2b20] focus:border-[#1a5c3a] focus:outline-none';

// ── Input section wrapper ─────────────────────────────────────────────────────

function InputSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-[#e5e5e3] bg-white p-5">
      <p className="text-[9px] font-bold tracking-widest text-[#a3a3a1] uppercase">{title}</p>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#737373]">{label}</label>
      {children}
    </div>
  );
}

// ── Waterfall row ─────────────────────────────────────────────────────────────

function WaterfallRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold text-[#1c2b20]' : ''}`}>
      <span className={muted ? 'text-[#737373]' : 'text-[#1c2b20]'}>{label}</span>
      <span
        className={
          value < 0 ? 'text-red-600' : value > 0 && bold ? 'text-[#1a5c3a]' : 'text-[#1c2b20]'
        }
      >
        {fmt(value)}
      </span>
    </div>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e5e3] bg-white px-4 py-3">
      <p className="mb-1.5 text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── MetricRow ─────────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'red' | 'green';
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#737373]">{label}</span>
      <span
        className={`font-semibold ${
          highlight === 'red'
            ? 'text-red-600'
            : highlight === 'green'
              ? 'text-[#1a5c3a]'
              : 'text-[#1c2b20]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Simulator Result Card ─────────────────────────────────────────────────────

function SimResultCard({
  result,
  simNOI,
  simOpEx,
  simState,
}: {
  result: FinancingSimulationResult;
  simNOI: number;
  simOpEx: number;
  simState: SimState;
}) {
  const cfPositive = (result.cashFlowMonth1 ?? 0) >= 0;
  const grossRent = simState.monthlyRent;
  const vacancy = grossRent * (simState.vacancyRate / 100);
  const effective = grossRent - vacancy;

  return (
    <div className="space-y-4">
      {/* Profitability verdict — always at top */}
      <div
        className={`rounded-xl border p-5 ${cfPositive ? 'border-[#1a5c3a] bg-[#ebf3ee]' : 'border-red-200 bg-red-50'}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-base font-bold ${cfPositive ? 'text-[#1a5c3a]' : 'text-red-600'}`}>
              {cfPositive ? '✅ LUCRATIVO' : '❌ NÃO LUCRATIVO'}
            </p>
            <p className={`mt-0.5 text-xs ${cfPositive ? 'text-[#2d7a4f]' : 'text-red-500'}`}>
              {cfPositive
                ? `Sobra ${fmt(result.cashFlowMonth1!)}/mês após a parcela`
                : `Falta ${fmt(Math.abs(result.cashFlowMonth1!))}/mês para cobrir`}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${cfPositive ? 'text-[#1a5c3a]' : 'text-red-600'}`}>
              {fmt(result.cashFlowMonth1!)}/mês
            </p>
            <p className="text-xs text-[#737373]">{fmt((result.cashFlowMonth1 ?? 0) * 12)}/ano</p>
          </div>
        </div>
      </div>

      {/* Cash flow waterfall */}
      <div className="space-y-2 rounded-xl border border-[#e5e5e3] bg-white p-5">
        <p className="mb-3 text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
          Fluxo Mensal Simulado
        </p>
        <WaterfallRow label="Aluguel Bruto" value={grossRent} />
        <WaterfallRow
          label={`(−) Vacância ${simState.vacancyRate.toFixed(1)}%`}
          value={-vacancy}
          muted
        />
        <WaterfallRow label="Renda Efetiva" value={effective} bold />
        <WaterfallRow label="(−) Despesas Operacionais" value={-simOpEx} muted />
        <WaterfallRow label="NOI" value={simNOI} bold />
        <WaterfallRow label={`(−) Parcela (Mês 1)`} value={-result.firstInstallment} muted />
        <div className="border-t border-[#e5e5e3] pt-2">
          <WaterfallRow label="Fluxo de Caixa" value={result.cashFlowMonth1 ?? 0} bold />
        </div>
      </div>

      {/* Loan structure */}
      <div className="space-y-2 rounded-xl border border-[#e5e5e3] bg-white p-5">
        <p className="mb-3 text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
          Financiamento
        </p>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-[#1c2b20]">{fmt(result.loanAmount)}</span>
          <span className="rounded-full bg-[#f5f5f3] px-2 py-0.5 text-xs font-semibold text-[#737373]">
            LTV {fmtPct(result.ltv)}
          </span>
        </div>
        <MetricRow label="Parcela Mês 1" value={`${fmt(result.firstInstallment)}/mês`} />
        {result.firstInstallment !== result.lastInstallment && result.schedule.length > 0 && (
          <MetricRow label="Parcela final" value={`${fmt(result.lastInstallment)}/mês`} />
        )}
        <MetricRow label="Total de parcelas" value={fmt(result.totalPaid)} />
        <MetricRow
          label="Total de juros"
          value={`${fmt(result.totalInterest)} (${fmtPct(result.totalInterestPercent)})`}
          highlight="red"
        />
        <MetricRow
          label="Prazo"
          value={`${result.schedule.length} meses (${Math.floor(result.schedule.length / 12)} anos)`}
        />
      </div>

      {/* Key metrics */}
      <div className="space-y-2 rounded-xl border border-[#e5e5e3] bg-white p-5">
        <p className="mb-3 text-[10px] font-bold tracking-widest text-[#a3a3a1] uppercase">
          Indicadores
        </p>
        <MetricRow label="Aluguel break-even" value={`${fmt(result.breakEvenRent)}/mês`} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#737373]">DSCR</span>
          <DscrBadge value={result.dscr} />
        </div>
        {result.cashOnCash !== null && (
          <MetricRow
            label="Cash-on-Cash"
            value={`${fmtPct(result.cashOnCash)} a.a.`}
            highlight={result.cashOnCash >= 6 ? 'green' : undefined}
          />
        )}
        {result.paybackYears !== null && (
          <MetricRow label="Payback da entrada" value={`${result.paybackYears.toFixed(1)} anos`} />
        )}
      </div>
    </div>
  );
}

// ── Installment chart ─────────────────────────────────────────────────────────

function InstallmentChart({
  chartData,
  monthlyNOI,
}: {
  chartData: { label: string; installment: number; noi?: number }[];
  monthlyNOI: number | null | undefined;
}) {
  if (chartData.length === 0) return null;
  const hasNOI = monthlyNOI != null;

  return (
    <div className="rounded-xl border border-[#e5e5e3] bg-white p-5">
      <h3 className="text-sm font-bold text-[#1c2b20]">Evolução da Parcela ao Longo do Prazo</h3>
      {hasNOI && (
        <p className="mt-0.5 text-xs text-[#737373]">
          Zona verde = meses em que o aluguel cobre a parcela
        </p>
      )}
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#737373' }} tickLine={false} />
            <YAxis
              tickFormatter={(v) => fmt(v)}
              tick={{ fontSize: 10, fill: '#737373' }}
              tickLine={false}
              axisLine={false}
              width={88}
            />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = { installment: 'Parcela', noi: 'NOI' };
                return [fmt(Number(value)), labels[String(name)] ?? String(name)];
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e3' }}
            />
            {hasNOI && (
              <Area
                type="monotone"
                dataKey="noi"
                name="noi"
                stroke="#1B3A5C"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="rgba(30, 132, 73, 0.12)"
                dot={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="installment"
              name="installment"
              stroke="#0E7C7B"
              strokeWidth={2}
              fill="rgba(192, 57, 43, 0.08)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Amortization table ────────────────────────────────────────────────────────

function AmortizationTable({
  show,
  onToggle,
  scheduleSlice,
  schedulePage,
  totalPages,
  totalRows,
  rowsPerPage,
  onPageChange,
}: {
  show: boolean;
  onToggle: () => void;
  scheduleSlice: {
    month: number;
    installment: number;
    interest: number;
    amortization: number;
    remainingBalance: number;
  }[];
  schedulePage: number;
  totalPages: number;
  totalRows: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
}) {
  if (totalRows === 0) return null;

  return (
    <div className="rounded-xl border border-[#e5e5e3] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-5 py-3.5 text-sm font-semibold text-[#1c2b20] hover:bg-[#f5f5f3]"
      >
        <span>Ver tabela de amortização completa</span>
        <span className="text-[#737373]">{show ? '▲' : '▼'}</span>
      </button>

      {show && (
        <div className="border-t border-[#e5e5e3]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#f5f5f3]">
                <tr>
                  {['Mês', 'Parcela', 'Juros', 'Amortização', 'Saldo Devedor'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-right font-semibold text-[#737373] first:text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleSlice.map((row) => (
                  <tr
                    key={row.month}
                    className={`border-t border-[#f5f5f3] ${row.month === 1 ? 'bg-teal-50' : 'hover:bg-[#fafaf9]'}`}
                  >
                    <td className="px-4 py-2 text-left font-medium text-[#1c2b20]">{row.month}</td>
                    <td className="px-4 py-2 text-right text-[#1c2b20]">{fmt(row.installment)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{fmt(row.interest)}</td>
                    <td className="px-4 py-2 text-right text-[#1a5c3a]">{fmt(row.amortization)}</td>
                    <td className="px-4 py-2 text-right text-[#737373]">
                      {fmt(row.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#e5e5e3] bg-[#f5f5f3]">
                <tr>
                  <td className="px-4 py-2.5 text-left text-xs font-bold text-[#1c2b20]">Total</td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[#1c2b20]">
                    {fmt(scheduleSlice.reduce((s, r) => s + r.installment, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-red-600">
                    {fmt(scheduleSlice.reduce((s, r) => s + r.interest, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[#1a5c3a]">
                    {fmt(scheduleSlice.reduce((s, r) => s + r.amortization, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-[#737373]">—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5e5e3] px-5 py-3">
            <span className="text-xs text-[#737373]">
              Mês {schedulePage * rowsPerPage + 1}–
              {Math.min((schedulePage + 1) * rowsPerPage, totalRows)} de {totalRows}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(0, schedulePage - 1))}
                disabled={schedulePage === 0}
                className="rounded-lg border border-[#e5e5e3] px-3 py-1 text-xs font-medium text-[#737373] hover:bg-[#f5f5f3] disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages - 1, schedulePage + 1))}
                disabled={schedulePage >= totalPages - 1}
                className="rounded-lg border border-[#e5e5e3] px-3 py-1 text-xs font-medium text-[#737373] hover:bg-[#f5f5f3] disabled:opacity-40"
              >
                Próximo →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
