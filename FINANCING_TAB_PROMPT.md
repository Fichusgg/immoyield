# ImóYield — Financing Simulator Tab

## What to build

Add a **"Financiamento"** tab to the Property Detail page that lets an investor simulate different loan scenarios and instantly see whether the rental income makes the financing profitable.

The investor's core question is: **"Se eu financiar com X% de entrada e Y% de juros, meu aluguel paga a parcela — e sobra quanto?"**

---

## Codebase context

- **`src/components/deals/DealDetailView.tsx`** — the property detail page. It already has a tab system. The existing `TabId` type is `'resumo' | 'analise' | 'projecoes' | 'comparaveis' | 'relatorio'`. The component already calls `analyzeRentalDeal(inputs)` and stores the result in `const analysis = ...`, `const m = analysis.metrics`. The metrics you need are already computed: `m.monthlyNOI`, `m.operatingExpenses`, `m.firstInstallment`, `m.loanAmount`.

- **`src/lib/calculations/financing.ts`** — exports `calculateAmortization(principal, annualRate, months, system)` which returns `AmortizationPeriod[]` with `{ month, installment, interest, amortization, remainingBalance }`. **Do not modify this function** — only add exports alongside it.

- **`src/lib/calculations/types.ts`** — exports `AmortizationSystem`, `AmortizationPeriod`, `FinancingModality`, `DealInputs`. Use these — do not redefine them.

- **`src/components/ui/currency-input.tsx`** — `<CurrencyInput value={number} onValueChange={(n) => {}} placeholder="0" className="..." />` — use this for all R$ inputs.

- **Recharts** is already installed and used in `DealDetailView.tsx` (`LineChart`, `AreaChart`, `BarChart`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Legend`, `Area`, `Bar`, `Cell`).

- **Styling tokens** (already used in the file — be consistent):
  - Cards: `rounded-xl border border-[#e5e5e3] bg-white`
  - Primary green text: `text-[#1a5c3a]`
  - Primary green bg: `bg-[#ebf3ee]`
  - Muted text: `text-[#737373]`
  - Text primary: `text-[#1c2b20]`
  - Page bg: `bg-[#F8F7F4]`
  - All currency: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })`
  - All %: `${v.toFixed(2)}%`

---

## Step 1 — Add `simulateFinancing()` to `src/lib/calculations/financing.ts`

Add these types and function **at the end of the file**, after the existing `calculateAmortization` export. Do not touch `calculateAmortization`.

```typescript
import type { FinancingModality } from './types';

export interface FinancingScenario {
  id: string;
  label: string;
  purchasePrice: number;
  downPayment: number;          // entrada em R$
  interestRateYear: number;     // % a.a.
  termMonths: number;
  system: AmortizationSystem;
  modality?: FinancingModality;
}

export interface FinancingSimulationResult {
  scenarioId: string;
  label: string;

  // Loan structure
  loanAmount: number;
  downPaymentPercent: number;   // downPayment / purchasePrice * 100
  ltv: number;                  // loanAmount / purchasePrice * 100

  // Installment info
  firstInstallment: number;
  lastInstallment: number;      // SAC: decreases to this. PRICE: same as first.
  averageInstallment: number;

  // Total cost of debt
  totalPaid: number;            // sum of all installments
  totalInterest: number;        // totalPaid - loanAmount
  totalInterestPercent: number; // totalInterest / loanAmount * 100

  // Profitability — null when monthlyNOI not available
  monthlyNOI: number | null;
  cashFlowMonth1: number | null;          // monthlyNOI - firstInstallment
  cashFlowAverage: number | null;         // monthlyNOI - averageInstallment
  cashFlowAnnual: number | null;          // cashFlowMonth1 * 12
  dscr: number | null;                    // monthlyNOI / firstInstallment
  cashOnCash: number | null;              // (cashFlowAnnual) / (downPayment + acquisitionCosts) * 100
  isProfitable: boolean | null;           // cashFlowMonth1 > 0
  breakEvenRent: number;                  // firstInstallment + monthlyOperatingExpenses
  paybackYears: number | null;            // downPayment / cashFlowAnnual (null if CF <= 0)

  schedule: AmortizationPeriod[];
}

export function simulateFinancing(
  scenario: FinancingScenario,
  monthlyNOI: number | null,
  monthlyOperatingExpenses: number,
  acquisitionCosts: number,
): FinancingSimulationResult {
  const loanAmount = scenario.purchasePrice - scenario.downPayment;
  const schedule = loanAmount > 0
    ? calculateAmortization(loanAmount, scenario.interestRateYear, scenario.termMonths, scenario.system)
    : [];

  const firstInstallment = schedule[0]?.installment ?? 0;
  const lastInstallment = schedule[schedule.length - 1]?.installment ?? 0;
  const totalPaid = schedule.reduce((sum, p) => sum + p.installment, 0);
  const averageInstallment = schedule.length > 0 ? totalPaid / schedule.length : 0;
  const totalInterest = totalPaid - loanAmount;

  const cashFlowMonth1 = monthlyNOI !== null ? monthlyNOI - firstInstallment : null;
  const cashFlowAverage = monthlyNOI !== null ? monthlyNOI - averageInstallment : null;
  const cashFlowAnnual = cashFlowMonth1 !== null ? cashFlowMonth1 * 12 : null;
  const totalInvested = scenario.downPayment + acquisitionCosts;

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    loanAmount,
    downPaymentPercent: scenario.purchasePrice > 0 ? (scenario.downPayment / scenario.purchasePrice) * 100 : 0,
    ltv: scenario.purchasePrice > 0 ? (loanAmount / scenario.purchasePrice) * 100 : 0,
    firstInstallment,
    lastInstallment,
    averageInstallment,
    totalPaid,
    totalInterest,
    totalInterestPercent: loanAmount > 0 ? (totalInterest / loanAmount) * 100 : 0,
    monthlyNOI,
    cashFlowMonth1,
    cashFlowAverage,
    cashFlowAnnual,
    dscr: (monthlyNOI !== null && firstInstallment > 0) ? monthlyNOI / firstInstallment : null,
    cashOnCash: (cashFlowAnnual !== null && totalInvested > 0) ? (cashFlowAnnual / totalInvested) * 100 : null,
    isProfitable: cashFlowMonth1 !== null ? cashFlowMonth1 > 0 : null,
    breakEvenRent: firstInstallment + monthlyOperatingExpenses,
    paybackYears: (cashFlowAnnual !== null && cashFlowAnnual > 0)
      ? scenario.downPayment / cashFlowAnnual
      : null,
    schedule,
  };
}
```

---

## Step 2 — Create `src/components/deals/tabs/FinanciamentoTab.tsx`

This is a `'use client'` component. It receives the deal's already-computed metrics so it never re-fetches data.

```typescript
interface FinanciamentoTabProps {
  purchasePrice: number;
  monthlyNOI: number | null;           // from analysis.metrics.monthlyNOI
  monthlyOperatingExpenses: number;    // from analysis.metrics.operatingExpenses
  acquisitionCosts: number;            // from analysis.metrics.totalAcquisitionCosts ?? totalInvestment - purchasePrice
  // Pre-fill from the deal's saved financing if it exists
  initialFinancing?: {
    downPayment: number;
    interestRateYear: number;
    termMonths: number;
    system: AmortizationSystem;
    modality?: FinancingModality;
  } | null;
}
```

### Internal state

```typescript
type TabMode = 'simulador' | 'comparar';
const [mode, setMode] = useState<TabMode>('simulador');

// Simulador mode — one live scenario
const [scenario, setScenario] = useState<FinancingScenario>(/* pre-filled from initialFinancing or defaults */);

// Comparar mode — up to 4 named scenarios
const [scenarios, setScenarios] = useState<FinancingScenario[]>([/* one default scenario */]);

// Amortization table visibility (simulador mode)
const [showSchedule, setShowSchedule] = useState(false);
```

Default scenario values when `initialFinancing` is null:
```typescript
{ downPayment: purchasePrice * 0.20, interestRateYear: 10.5, termMonths: 360, system: 'SAC', modality: 'SFH' }
```

Use `useMemo` to derive `FinancingSimulationResult` from scenario state — never compute inside render.

---

### Layout — Simulador Mode

```
┌─────────────────────────────────────────────────────────────┐
│  [Simulador]  [Comparar]          ← mode toggle (pill tabs) │
└─────────────────────────────────────────────────────────────┘

Two columns (lg:grid-cols-[380px_1fr]):

LEFT — Inputs card:
  ┌──────────────────────────────┐
  │ IMÓVEL                       │
  │ Preço de Compra: R$ XXX      │  ← read-only
  │ NOI Mensal:      R$ XXX      │  ← read-only, green if >0
  │ ─────────────────────────── │
  │ CENÁRIO                      │
  │ Entrada (R$)  [CurrencyInput]│
  │               XX% do imóvel  │  ← live badge
  │ Taxa (% a.a.) [input]        │
  │ Prazo (meses) [input]        │
  │               = XX anos      │  ← live display
  │ Sistema  [SAC]  [PRICE]      │  ← pill toggle
  │ Modalidade                   │
  │ [SFH] [SFI] [Consórcio] [Outro] ← pill selector
  └──────────────────────────────┘

RIGHT — Results card:
  ┌──────────────────────────────────────────┐
  │ VALOR FINANCIADO     R$ XXX   LTV: XX%   │
  ├──────────────────────────────────────────┤
  │ PARCELA (MÊS 1)      R$ X.XXX/mês        │
  │ SAC: cai até R$ XXX no mês final         │  ← only for SAC
  ├──────────────────────────────────────────┤
  │ NOI Mensal           R$ X.XXX            │
  │ (–) Parcela          R$ X.XXX            │
  │ ─────────────────────────────────────── │
  │ FLUXO DE CAIXA       R$ X.XXX/mês        │  ← 2xl font, green or red
  │                      R$ X.XXX/ano        │
  │                                          │
  │ ┌────────────────────────────────────┐   │
  │ │ ✅ LUCRATIVO                       │   │  ← green bg
  │ │ Sobra R$ XXX/mês após a parcela    │   │
  │ └────────────────────────────────────┘   │
  │  or                                      │
  │ ┌────────────────────────────────────┐   │
  │ │ ❌ NÃO LUCRATIVO                   │   │  ← red bg (light)
  │ │ Falta R$ XXX/mês para cobrir       │   │
  │ └────────────────────────────────────┘   │
  ├──────────────────────────────────────────┤
  │ Aluguel de break-even  R$ X.XXX/mês      │
  │ DSCR                   X.XX  [badge]     │
  │ Cash-on-Cash           X.XX% a.a.        │
  │ Payback da entrada     XX anos           │
  ├──────────────────────────────────────────┤
  │ CUSTO TOTAL DO FINANCIAMENTO             │
  │ Valor financiado    R$ XXX.XXX           │
  │ Total de parcelas   R$ XXX.XXX           │
  │ Total de juros      R$ XXX.XXX (XX%)     │
  │ Prazo               XXX meses (XX anos)  │
  └──────────────────────────────────────────┘
```

If `monthlyNOI` is null (deal not analyzed yet), replace the profitability section with:
```
⚠️ Análise não disponível
Execute a análise completa para ver o fluxo de caixa.
```
Still show loan cost metrics (total paid, total interest, etc.) — those work without NOI.

---

### Installment Evolution Chart (Simulador mode, below the two columns)

Use `<ResponsiveContainer width="100%" height={260}>` with a `<LineChart>`.

Data: sample the schedule at months 1, 12, 24, 36, 60, 84, 120, 180, 240, 300, 360 (or up to termMonths). Each data point: `{ month, year, installment, noi }`.

```
Series:
  - "Parcela" — solid teal line (#0E7C7B), using schedule installment values
  - "NOI" — dashed navy line (#1B3A5C), flat at monthlyNOI value (show only if NOI available)

Area fill between them:
  - If installment < NOI: fill green (rgba(30, 132, 73, 0.12)) — profitable zone
  - If installment > NOI: fill red (rgba(192, 57, 43, 0.10)) — loss zone
  - Implement using two <Area> components with different fill conditions,
    or simply use a ReferenceArea from recharts between the two lines.

X-axis: show year labels (Ano 1, Ano 5, Ano 10, etc.)
Y-axis: formatted as R$ XXX
Tooltip: show Parcela, NOI, and Fluxo de Caixa (difference) for hovered point
```

Title above chart: "Evolução da Parcela ao Longo do Prazo"
Subtitle: "A zona verde indica os meses em que o aluguel cobre a parcela"

---

### Amortization Schedule Table (Simulador mode, collapsible)

Trigger: a button "Ver tabela de amortização completa ▼" below the chart.

When expanded, show a table with pagination — 24 rows per page (2 years):

| Mês | Parcela | Juros | Amortização | Saldo Devedor |
|-----|---------|-------|-------------|---------------|

- All values formatted as R$
- Row for month 1 highlighted with light teal background
- Footer row: "Total" with sum of Parcela, Juros, Amortização columns
- Pagination: "← Anterior" / "Próximo →" buttons, "Mês 1–24 de 360"

---

### Layout — Comparar Mode

**Adding/removing scenarios:**
- "＋ Adicionar Cenário" button (disabled when 4 scenarios exist)
- Each card has a "×" remove button (disabled when only 1 scenario)
- New scenario is cloned from the last scenario in the list, with label "Cenário N"

**Scenario cards** — responsive grid: 1 col on mobile, 2 cols on md, up to 4 cols on xl.

Each card:
```
┌──────────────────────────┐
│ [Name input]          ×  │  ← editable label input
│ ─────────────────────── │
│ Entrada   [CurrencyInput]│
│           XX% · LTV XX%  │
│ Taxa      [input] % a.a. │
│ Prazo     [input] meses  │
│ Sistema   [SAC] [PRICE]  │
│ ─────────────────────── │
│ Parcela Mês 1  R$ X.XXX  │
│ NOI            R$ X.XXX  │
│ ─────────────────────── │
│ FLUXO DE CAIXA           │
│ R$ X.XXX/mês             │  ← colored
│ ✅ LUCRATIVO / ❌ NÃO    │  ← verdict badge
│ ─────────────────────── │
│ DSCR       X.XX          │
│ CoC        X.XX% a.a.    │
│ Payback    XX anos       │
│ Total Juros R$ XXX.XXX   │
└──────────────────────────┘
```

**Comparison summary table** (below cards, only when ≥2 scenarios):

Rows = metrics. Columns = scenarios. Best value in each row gets a `bg-[#ebf3ee]` highlight, worst gets a `bg-red-50` highlight.

| Métrica | Cenário 1 | Cenário 2 | ... |
|---------|-----------|-----------|-----|
| Entrada | R$ X (XX%) | R$ X (XX%) | |
| LTV | XX% | XX% | |
| Parcela Mês 1 | R$ X | R$ X | |
| **Fluxo de Caixa** | **R$ X** | **R$ X** | |
| **Lucrativo?** | ✅ Sim | ❌ Não | |
| DSCR | X.XX | X.XX | |
| Total de Juros | R$ X | R$ X | |
| Cash-on-Cash | X% | X% | |

For "best/worst" logic:
- Higher is better: Fluxo de Caixa, DSCR, Cash-on-Cash
- Lower is better: LTV, Parcela, Total de Juros
- "Lucrativo?" — all ✅ scenarios get green, all ❌ get red

**Cash flow comparison bar chart** (below summary table, only when ≥2 scenarios):

```
<BarChart> with one bar per scenario.
- Bar color: green (#1a5c3a) if cashFlowMonth1 > 0, red (#C0392B) if ≤ 0
- X-axis: scenario labels
- Y-axis: R$ fluxo de caixa mensal
- <ReferenceLine y={0} stroke="#737373" strokeDasharray="4 4" />
- Tooltip: show full breakdown (NOI, Parcela, FC)
```

---

## Step 3 — Wire into `DealDetailView.tsx`

### 3a. Add the tab to the tab list

Find the `TABS` array (around line 47) and insert the new tab between `analise` and `projecoes`:

```typescript
// Add to TabId union type:
type TabId = 'resumo' | 'analise' | 'financiamento' | 'projecoes' | 'comparaveis' | 'relatorio';

// Add to TABS array after the 'analise' entry:
{ id: 'financiamento', label: 'Financiamento', icon: <span>💳</span> },
```

### 3b. Render the tab content

In the section where tabs are rendered (around line 313), add:

```typescript
{activeTab === 'financiamento' && (
  <FinanciamentoTab
    purchasePrice={inputs.purchasePrice}
    monthlyNOI={m.monthlyNOI ?? null}
    monthlyOperatingExpenses={m.operatingExpenses}
    acquisitionCosts={(m.totalAcquisitionCosts ?? m.totalInvestment) - inputs.purchasePrice}
    initialFinancing={inputs.financing?.enabled ? {
      downPayment: inputs.financing.downPayment,
      interestRateYear: inputs.financing.interestRateYear,
      termMonths: inputs.financing.termMonths,
      system: inputs.financing.system,
      modality: inputs.financing.modality,
    } : null}
  />
)}
```

Import at the top: `import { FinanciamentoTab } from '@/components/deals/tabs/FinanciamentoTab';`

---

## Step 4 — DSCR badge helper

Add this small helper inside `FinanciamentoTab.tsx` (not exported):

```typescript
function DscrBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#737373]">—</span>;
  const good = value >= 1.3;
  const ok = value >= 1.1;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
      good ? 'bg-[#ebf3ee] text-[#1a5c3a]' :
      ok   ? 'bg-yellow-50 text-yellow-700' :
             'bg-red-50 text-red-600'
    }`}>
      {value.toFixed(2)}
      <span className="font-normal">{good ? '· Bom' : ok ? '· Ok' : '· Baixo'}</span>
    </span>
  );
}
```

Use this badge in both Simulador and Comparar modes.

---

## What NOT to do

- Do not modify `calculateAmortization()` — only add alongside it
- Do not add a Supabase save for scenarios — all state is local only
- Do not create a new page or route — this is a tab inside the existing `/imoveis/[id]` page
- Do not add the tab to the sidebar nav in the old `DealDetailView` sidebar (that was refactored out)
- Do not install new dependencies — Recharts and all needed UI are already available
