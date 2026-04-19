# ImóYield — Claude Code Implementation Prompt
## Full DealCheck Parity + Brazilian Market Adaptations

---

## Context & Goal

You are working on **ImóYield**, a Brazilian real estate investment analysis app built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **Supabase**.

The goal of this session is to make ImóYield functionally identical to [DealCheck.io](https://dealcheck.io) in terms of its analysis flow, UI structure, and metrics — but fully adapted to the Brazilian real estate market (BRL currency, Brazilian taxes, Brazilian financing modalities, Brazilian indices).

You have already done a full reverse-engineering of DealCheck. The tasks below are derived from that blueprint and represent **concrete gaps** between what currently exists in this codebase and what must be built. Work through them in order.

---

## Codebase Overview (Current State)

- `src/lib/calculations/types.ts` — `DealInputs` type (incomplete — missing many fields)
- `src/lib/calculations/rental.ts` — `analyzeRentalDeal()` (missing: GRM, Rent-to-Value, LTV, DSCR, BER, Payback, IRR, ROE)
- `src/lib/calculations/projections.ts` — `calculateProjections()` (only goes to 10 years, missing columns)
- `src/components/deals/add-deal/Wizard.tsx` — Wizard form (incomplete steps, missing all BR-specific fields)
- `src/components/deals/add-deal/Sidebar.tsx` — Deal type selector sidebar
- `src/components/deals/DealDetailView.tsx` — Property detail page with sidebar nav (needs full tab redesign)
- `src/app/imoveis/[id]/page.tsx` — Property detail server page
- `src/app/deals/new/page.tsx` — New deal page
- `src/lib/supabase/deals.ts` — Supabase DB layer

---

## TASK 1 — Expand the Core Data Types

**File:** `src/lib/calculations/types.ts`

Replace the current `DealInputs` interface with a comprehensive one. Keep backward compatibility with existing fields. Add all new fields as optional so existing saved deals don't break.

```typescript
export type AmortizationSystem = 'SAC' | 'PRICE';
export type FinancingModality = 'SFH' | 'SFI' | 'consorcio' | 'avista' | 'outro';
export type RentAdjustmentIndex = 'IGP-M' | 'IPCA' | 'INPC' | 'IPC-A' | 'fixo';
export type MonetaryCorrection = 'TR' | 'IPCA' | 'nenhuma';
export type TaxRegime = 'PF_carneleao' | 'PJ_lucro_presumido' | 'PJ_simples' | 'isento';
export type DealStrategy = 'aluguel' | 'brrrr' | 'flip' | 'airbnb' | 'comercial';

export interface DealInputs {
  // ── Property Info ──────────────────────────────────────────────────────────
  strategy?: DealStrategy;
  propertyType?: string;             // keep for backward compat
  propertySubtype?: string;          // 'apartamento' | 'casa' | 'sala_comercial' | 'loja' | 'galpao' | 'terreno'
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  areaM2?: number;
  landAreaM2?: number;
  yearBuilt?: number;
  condoName?: string;                // Nome do condomínio

  // ── Purchase & Acquisition Costs ──────────────────────────────────────────
  purchasePrice: number;
  acquisitionCosts: {
    itbiPercent: number;             // e.g. 0.03 = 3%
    cartorio: number;                // fixed R$ value
    reforms: number;                 // reforma/benfeitorias
    otherCosts?: number;             // outros custos de fechamento
    itbiCalcBase?: 'purchase' | 'venal';  // ITBI calculated on purchase price or valor venal
  };
  valorVenal?: number;               // Valor venal para cálculo do IPTU e ITBI
  afterRepairValue?: number;         // ARV (top-level for convenience)

  // ── Financing ─────────────────────────────────────────────────────────────
  financing: {
    enabled: boolean;
    modality?: FinancingModality;    // SFH, SFI, consorcio, avista
    downPayment: number;             // entrada em R$
    downPaymentPercent?: number;     // entrada em % (alternative input)
    interestRateYear: number;        // % a.a.
    termMonths: number;              // prazo em meses
    system: AmortizationSystem;      // SAC ou PRICE (Tabela Price)
    monetaryCorrection?: MonetaryCorrection;  // TR, IPCA, nenhuma
    originationFee?: number;         // taxa de originação R$
    originationFeePercent?: number;  // taxa de originação %
    bankAppraisalFee?: number;       // taxa de avaliação do banco
  };

  // ── Revenue ───────────────────────────────────────────────────────────────
  revenue: {
    monthlyRent: number;
    vacancyRate: number;             // 0 to 1 (e.g. 0.08 = 8%)
    rentAdjustmentIndex?: RentAdjustmentIndex;
    annualRentGrowthRate?: number;   // override: use this % instead of index
    otherMonthlyIncome?: number;     // parking, storage, etc.
    otherIncomeDescription?: string;
    // Airbnb
    dailyRate?: number;
    occupancyRate?: number;
    // Flip
    afterRepairValue?: number;
    holdingMonths?: number;
    // Projections growth
    ipcaIndexed?: boolean;
    annualIpcaRate?: number;
  };

  // ── Operating Expenses ────────────────────────────────────────────────────
  expenses: {
    condo: number;                   // condomínio mensal
    iptu: number;                    // IPTU mensal (rateado do anual)
    insurance?: number;              // seguro mensal
    managementPercent: number;       // % administração (e.g. 0.08 = 8%)
    maintenancePercent: number;      // % manutenção
    capexPercent?: number;           // % reserva CapEx
    utilitiesMonthly?: number;       // água/luz/gás (quando pago pelo proprietário)
    accountingMonthly?: number;      // contabilidade
    otherMonthly?: number;           // outras despesas mensais
    sellingCostPercent?: number;     // custo de venda (flip)
    // Input mode: 'itemized' | 'percent_rent' | 'percent_purchase'
    expenseInputMode?: 'itemized' | 'percent_rent' | 'percent_purchase';
    totalExpensePercent?: number;    // when using percent mode
  };

  // ── Tax & Projections ─────────────────────────────────────────────────────
  tax?: {
    regime?: TaxRegime;
    incomeTaxRate?: number;          // alíquota efetiva IR sobre aluguel
    capitalGainsTaxRate?: number;    // GCAP (default 0.15)
    depreciationYears?: number;      // default 25 (lei brasileira)
    landValuePercent?: number;       // % do valor que é terreno (não deprecia)
  };

  projections?: {
    annualAppreciation?: number;     // % valorização imóvel a.a.
    annualRentGrowth?: number;       // % crescimento aluguel a.a.
    annualExpenseGrowth?: number;    // % crescimento despesas a.a.
    holdingPeriodYears?: number;     // horizonte de análise
    sellingCostPercent?: number;     // custo de venda futuro
    selic?: number;                  // SELIC atual (para comparativo)
    cdi?: number;                    // CDI atual (para comparativo)
    ipca?: number;                   // IPCA projetado (para comparativo)
    tesouroIPCA?: number;            // Tesouro IPCA+ (para comparativo)
  };
}
```

---

## TASK 2 — Expand the Calculations Engine

**File:** `src/lib/calculations/rental.ts`

Add ALL missing metrics to the return value of `analyzeRentalDeal()`. Do not break existing callers — only add new fields to the `metrics` object.

New metrics to add (all with formulas):

```typescript
// In the returned metrics object, add:
{
  // Already existing — keep:
  capRate,          // (NOI * 12) / purchasePrice * 100
  cashOnCash,       // (monthlyCashFlow * 12) / cashOutlay * 100
  totalInvestment,
  loanAmount,
  cashOutlay,
  monthlyNOI,
  monthlyCashFlow,
  grossMonthlyRent,
  vacancyLoss,
  effectiveRent,
  operatingExpenses,
  firstInstallment,

  // NEW — add these:
  annualNOI,               // monthlyNOI * 12
  annualCashFlow,          // monthlyCashFlow * 12
  annualGrossRent,         // grossMonthlyRent * 12
  
  grm,                     // purchasePrice / (grossMonthlyRent * 12)
                           // "Gross Rent Multiplier" — in BR: n° de meses para pagar com aluguel
  grmMonths,               // purchasePrice / grossMonthlyRent  (more intuitive for BR market)
  
  rentToValue,             // (grossMonthlyRent / purchasePrice) * 100  — benchmark: >0.5% is good
  
  ltv,                     // (loanAmount / purchasePrice) * 100
  
  dscr,                    // monthlyNOI / firstInstallment  (if no financing: null)
                           // Debt Service Coverage Ratio — banks require >1.2
  
  breakEvenRatio,          // (operatingExpenses + firstInstallment) / (grossMonthlyRent + otherIncome)
                           // BER — percentage of income needed to break even
  
  netRentToValue,          // (monthlyCashFlow / cashOutlay) * 100  — same as CoC but displayed differently
  
  paybackYears,            // cashOutlay / annualCashFlow  — years to recover invested capital
                           // if annualCashFlow <= 0: null (no payback)
  
  roi,                     // ((annualCashFlow + annualAppreciation) / cashOutlay) * 100
                           // For year-1 ROI: use 0 appreciation in base analysis
  
  equityYear1,             // purchasePrice - loanAmount + (loan paid in year 1)
  
  // ITBI calculated amount (for display in acquisition breakdown)
  itbiAmount,              // purchasePrice * acquisitionCosts.itbiPercent
  totalAcquisitionCosts,   // itbiAmount + cartorio + reforms + otherCosts
  
  // Monthly breakdown (for the Analysis tab waterfall display)
  waterfall: {
    grossRent: number,
    otherIncome: number,
    vacancyLoss: number,
    effectiveGrossIncome: number,
    condoExpense: number,
    iptuMonthly: number,
    insuranceMonthly: number,
    managementFee: number,
    maintenanceFee: number,
    capexFee: number,
    otherExpenses: number,
    totalOperatingExpenses: number,
    noi: number,
    debtService: number,
    cashFlowBeforeTax: number,
    incomeTax: number,
    netCashFlow: number,
  }
}
```

Also update `calculateProjections()` in `src/lib/calculations/projections.ts`:

- Change signature to accept a `projectionSettings` object with `annualAppreciation`, `annualRentGrowth`, `annualExpenseGrowth`, `selic`, `cdi`, `holdingPeriodYears`
- Always return data for years: **1, 2, 3, 5, 10, 20, 30** (not 1–10 sequentially)
- Each year row must include:
  ```typescript
  {
    year: number,
    propertyValue: number,        // estimated value after appreciation
    equity: number,               // propertyValue - remainingBalance
    remainingBalance: number,     // remaining loan balance
    monthlyRent: number,          // rent grown by annualRentGrowth
    annualGrossRent: number,
    annualNOI: number,
    annualCashFlow: number,
    capRate: number,              // recalculated each year
    cashOnCash: number,           // recalculated using original cashOutlay
    roi: number,                  // cumulative ROI including appreciation
    irr: number,                  // IRR up to this year (if sold at this point)
    cumulativeCashFlow: number,   // sum of all cash flows from year 1 to this year
    saleProfit: number,           // if sold this year: propertyValue - remainingBalance - sellingCosts - capitalGainsTax - originalInvestment
    sellingCosts: number,
    capitalGainsTax: number,
  }
  ```
- Also compute and return `irrOverall` for the full holding period

Add a new export `calculateIRR(cashFlows: number[]): number` using Newton-Raphson or bisection method. Cash flows array: `[-initialInvestment, cf_year1, cf_year2, ..., cf_yearN + saleProceeds]`

---

## TASK 3 — Complete the Wizard Form

**File:** `src/components/deals/add-deal/Wizard.tsx`

This is the largest change. The current wizard has 4 incomplete steps. Replace it with **6 complete steps** matching the blueprint exactly.

### Step Structure

```
Step 1: Dados do Imóvel     (Property Info)
Step 2: Compra & Custos     (Purchase & Acquisition Costs)
Step 3: Financiamento       (Financing)
Step 4: Receitas            (Rental Income)
Step 5: Despesas            (Operating Expenses)
Step 6: Projeções & IR      (Projections & Tax)
```

### Update the Zod schema (`dealInputsSchema`)

Expand to match the new `DealInputs` type. All new fields should be optional with sensible Brazilian defaults:

```typescript
// Defaults to pre-fill for Brazilian market:
const BRAZIL_DEFAULTS = {
  purchase: {
    itbiPercent: 3,          // 3% (São Paulo default)
    cartorio: 3000,          // R$ 3.000 estimado
  },
  financing: {
    modality: 'SFH',
    interestRateYear: 10.5,  // taxa SFH típica 2025
    termMonths: 360,         // 30 anos
    system: 'SAC',
    monetaryCorrection: 'TR',
  },
  revenue: {
    vacancyRate: 8,           // 8% (residencial)
    rentAdjustmentIndex: 'IPCA',
  },
  expenses: {
    managementPercent: 8,    // 8% administração
    maintenancePercent: 1,   // 1% manutenção
    capexPercent: 1,         // 1% CapEx
  },
  projections: {
    annualAppreciation: 6,   // 6% valorização a.a.
    annualRentGrowth: 4.5,   // IPCA estimado
    annualExpenseGrowth: 4.5,
    holdingPeriodYears: 10,
    selic: 13.25,
    cdi: 13.15,
    tesouroIPCA: 7.5,
  },
  tax: {
    regime: 'PF_carneleao',
    capitalGainsTaxRate: 15,
    depreciationYears: 25,
    landValuePercent: 20,
  }
};
```

### Step 1 — Dados do Imóvel (Property Info)

Fields to add/complete:
- Property name (already exists — keep)
- **Strategy selector** (large card buttons): `Aluguel de Longo Prazo` / `BRRRR` / `Reforma e Venda (Flip)` / `Temporada (Airbnb)` — replaces the sidebar type selector. This must be the FIRST thing the user sees.
- Endereço (street + number)
- Bairro
- Cidade + Estado (dropdown of Brazilian states)
- CEP
- Tipo do imóvel: `Apartamento` / `Casa` / `Sala Comercial` / `Loja` / `Galpão` / `Terreno`
- Quartos (0–10, number input)
- Banheiros (number input with 0.5 increments: 1, 1.5, 2, 2.5...)
- Vagas de garagem
- Área útil (m²)
- Área do terreno (m²) — optional, show for Casa/Terreno
- Ano de construção
- Nome do condomínio (optional)
- Upload de fotos (optional — keep existing functionality if present)
- Notas / observações (textarea)

### Step 2 — Compra & Custos (Purchase & Acquisition Costs)

Fields:
- **Preço de Compra** (CurrencyInput, required)
- **Valor Após Reforma (ARV)** — show only for BRRRR/Flip strategies
- **Orçamento de Reforma** — show only for BRRRR/Flip
- **Valor Venal** (optional) — used as ITBI base alternative
- **ITBI (%)** — default 3%, show calculated R$ amount in real-time
  - Small helper text: "SP: 3% • RJ: 2% • BH: 3% • média nacional: 2–3%"
- **Custos de Cartório / Registro** (CurrencyInput) — default R$ 3.000
- **Outros Custos de Fechamento** (CurrencyInput)
- **Resumo de Custos**: live-calculated summary box showing:
  ```
  Preço de Compra:          R$ XXX
  + ITBI (X%):              R$ XXX
  + Cartório/Registro:      R$ XXX
  + Orçamento de Reforma:   R$ XXX
  ─────────────────────────────────
  = Custo Total de Aquisição: R$ XXX
  ```

### Step 3 — Financiamento (Financing)

Fields:
- **Toggle: Compra à Vista / Financiado** (large toggle, not a checkbox)
- When **Financiado**:
  - **Modalidade**: `SFH` / `SFI` / `Consórcio` / `Outro` — card selector
    - Show tooltip for each: SFH = "até R$ 1,5M, juros regulados"; SFI = "acima de R$ 1,5M, taxa livre"; Consórcio = "sem juros, taxa adm"
  - **Entrada (R$)** — CurrencyInput
  - **Entrada (%)** — percentage input that syncs with the R$ field using purchase price
  - **Valor Financiado** — auto-calculated: `purchasePrice - downPayment` (read-only display)
  - **LTV** — auto-calculated: `(loanAmount / purchasePrice) * 100` (read-only badge)
  - **Taxa de Juros** (% a.a.) — default based on modality (SFH: 10.5%, SFI: 11.5%)
  - **Prazo** (meses) — default 360, slider + input
  - **Sistema de Amortização**: `SAC` / `PRICE (Tabela Price)` — radio buttons with brief explanation of each
  - **Correção Monetária**: `TR` / `IPCA` / `Nenhuma` — affects saldo devedor over time
  - **Taxa de Originação / Avaliação** (optional, CurrencyInput)
- Live preview: "**Parcela estimada (mês 1):** R$ XXX" — calculated in real-time

### Step 4 — Receitas (Rental Income)

For **Aluguel/BRRRR**:
- **Aluguel Mensal Bruto** (CurrencyInput, required)
- **Taxa de Vacância (%)** — default 8%, slider 0–30%
  - Helper: "Residencial SP: 8–12% • Comercial: 15–25%"
- **Renda Adicional Mensal** (garagem avulsa, storage, etc.) — optional CurrencyInput + description text field
- **Índice de Reajuste Anual**: `IGP-M` / `IPCA` / `INPC` / `% fixo` — card selector
  - If `% fixo`: show a number input
  - Show current index value: "IGP-M atual: X.X% a.a."
- **Rent-to-Value live badge**: show "(X.XX% a.m.)" next to the rent field, colored green if >0.5%, yellow if 0.3–0.5%, red if <0.3%

For **Airbnb**:
- Diária média (R$)
- Taxa de ocupação (%) — default 65%
- Calculated: Receita mensal estimada (read-only)

For **Flip**:
- ARV (already in Step 2, just show a reminder)
- Prazo de reforma estimado (meses)
- Custo de venda (% do ARV) — default 6%

### Step 5 — Despesas Operacionais (Operating Expenses)

- **Modo de entrada**: `Itemizado` / `% da Receita Bruta` / `% do Preço de Compra` — tab selector at the top

When **Itemizado** (default):
- **Condomínio** (R$/mês) — CurrencyInput
- **IPTU** (R$/mês) — CurrencyInput with helper: "Digite o IPTU anual ÷ 12"
  - Show auto-estimate: "Estimativa: R$ XXX/mês" based on 1% of `valorVenal ?? purchasePrice`
- **Seguro** (R$/mês) — CurrencyInput, default ~R$ 80/mês
- **Administração Imobiliária** (%) — default 8%, show calculated R$ amount in real-time
- **Manutenção e Reparos** (%) — default 1%, show calculated R$ amount
- **CapEx — Reserva de Reposição** (%) — default 1%
  - Helper: "Reserva para substituição de equipamentos, telhado, etc."
- **Utilities / Serviços** (R$/mês) — optional
- **Contabilidade / Outros** (R$/mês) — optional
- **Total de Despesas Operacionais**: live-calculated, prominently displayed

When **% da Receita Bruta**:
- Single input: total expenses as % of gross rent (e.g. 35%)

- **Resumo Visual**: a clean waterfall showing Aluguel → Vacância → Receita Efetiva → Despesas → NOI in real-time

### Step 6 — Projeções & Impostos (Projections & Tax)

- **Valorização Anual do Imóvel (%)** — default 6%, slider 0–20%
- **Crescimento Anual do Aluguel (%)** — default 4.5% (IPCA), slider 0–15%
- **Crescimento Anual das Despesas (%)** — default 4.5%, slider 0–15%
- **Horizonte de Análise** — dropdown: 5 / 10 / 15 / 20 / 30 anos
- **Custo de Venda Futuro (%)** — default 6% (comissão + custos)

**Bloco de Impostos:**
- **Regime Tributário**: `PF — Carnê-Leão` / `PJ — Lucro Presumido` / `PJ — Simples Nacional` / `Isento`
  - Small description of each option
- **GCAP — Ganho de Capital**: default 15%
  - Helper: "15% até R$5M de lucro • Isenção: imóvel único <R$440k ou reinvestimento em 180 dias"

**Benchmarks de Comparação (Custo de Oportunidade):**
- **SELIC atual (%)** — editable, default 13.25%
- **CDI atual (%)** — editable, default 13.15%
- **Tesouro IPCA+ (% real)** — editable, default 7.5%

### Save Button Behavior (CRITICAL)

After the user clicks "Salvar Propriedade" at the end of step 6:
1. Run `analyzeRentalDeal(inputs)` and `calculateProjections(inputs)` synchronously
2. Save to Supabase with both `inputs` and `results_cache` populated
3. On success: **redirect immediately to `/imoveis/[id]`** using `router.push()`
4. Do NOT show a success toast and stay on the wizard page
5. The `/imoveis/[id]` page should open on the **"Análise"** tab by default

---

## TASK 4 — Redesign the Property Detail Page (DealDetailView)

**File:** `src/components/deals/DealDetailView.tsx`

Replace the current sidebar navigation with a **top horizontal tab bar** matching DealCheck's layout.

### New Tab Structure

```
[Resumo]  [Análise]  [Projeções]  [Comparáveis]  [Relatório]
```

- `Resumo` is the DEFAULT tab when arriving from the wizard save
- All 5 tabs are always visible
- Active tab has a colored underline indicator
- Tab bar is sticky at the top of the content area

### TAB 1 — Resumo (Summary)

Layout:
```
[Property Photo / Map]   [Property Title + Address + Type Badge]
                         [Tags row]
                         [Last updated]

[KPI Card 1]  [KPI Card 2]  [KPI Card 3]  [KPI Card 4]
Fluxo de Caixa  Cap Rate  Cash-on-Cash  Rent-to-Value

[Financial Summary Table]
  Capital Necessário:      R$ XXX
  Parcela Mensal:          R$ XXX
  NOI Mensal:              R$ XXX
  Fluxo de Caixa Mensal:   R$ XXX (colored: green if positive)
  Fluxo de Caixa Anual:    R$ XXX
  Aluguel Bruto Anual:     R$ XXX
```

KPI cards must show **4 primary metrics** prominently:
1. **Fluxo de Caixa** (R$/mês) — colored green/red based on sign
2. **Cap Rate** (% a.a.)
3. **Cash-on-Cash** (% a.a.)
4. **Rent-to-Value** (% a.m.) — with green/yellow/red badge

### TAB 2 — Análise (Analysis)

This replaces the current `BrazilianAnalysis` + `ResultsScreen` combination.

Build a clean, vertical waterfall layout with collapsible blocks:

**Block A — Resumo da Compra**
```
Preço de Compra:            R$ XXX
(+) ITBI (3%):              R$ XXX
(+) Cartório / Registro:    R$ XXX
(+) Orçamento de Reforma:   R$ XXX
(+) Outros Custos:          R$ XXX
(=) Custo Total de Aquisição: R$ XXX   ← bold, highlighted
(–) Valor do Empréstimo:    R$ XXX
(=) Capital Próprio Investido: R$ XXX  ← bold, highlighted
    LTV:                    XX%
```

**Block B — Receitas**
```
Aluguel Bruto (mês):        R$ XXX
(–) Vacância (8%):          R$ XXX
(+) Outras Receitas:        R$ XXX
(=) Renda Efetiva:          R$ XXX     ← highlighted
```

**Block C — Despesas Operacionais**
```
Condomínio:                 R$ XXX
IPTU:                       R$ XXX
Seguro:                     R$ XXX
Administração (8%):         R$ XXX
Manutenção (1%):            R$ XXX
CapEx (1%):                 R$ XXX
Outros:                     R$ XXX
(=) Total Despesas:         R$ XXX     ← bold
```

**Block D — Resultados**
```
NOI (Renda Oper. Líquida):  R$ XXX/mês  (R$ XXX/ano)
(–) Parcela do Financ.:     R$ XXX/mês
(=) Fluxo de Caixa:         R$ XXX/mês  ← large, colored
    Fluxo de Caixa Anual:   R$ XXX
```

**Block E — Indicadores de Retorno** (grid of metric cards, 3 columns)

| Métrica | Valor | Benchmark |
|---------|-------|-----------|
| Cap Rate | X.XX% | Bom: >5% |
| Cash-on-Cash | X.XX% | Bom: >6% |
| GRM | XXX meses | Bom: <200 meses |
| Rent-to-Value | X.XX% a.m. | Bom: >0.5% |
| LTV | XX% | Bom: <80% |
| DSCR | X.XX | Bom: >1.2 |
| Break-Even Ratio | XX% | Bom: <80% |
| Payback | XX anos | — |
| ROI (Ano 1) | XX% | — |

Each card shows the metric name, calculated value, and a colored "Bom/Atenção/Ruim" badge based on Brazilian market benchmarks.

**Block F — Comparativo de Custo de Oportunidade** (show only if SELIC/CDI configured)

```
Retorno deste imóvel (CoC):   X.XX% a.a.
vs. CDI (100%):              XX.XX% a.a.   [+/- X.XX pp]
vs. Tesouro IPCA+:           X.XX% a.a.   [+/- X.XX pp]
vs. Poupança (70% SELIC):    X.XX% a.a.   [+/- X.XX pp]
```

### TAB 3 — Projeções (Projections)

Show projection table + 2 charts.

**Projection Table** (years 1, 2, 3, 5, 10, 20, 30):
| Ano | Val. Imóvel | Equity | Aluguel Bruto | Fluxo de Caixa | Cap Rate | CoC | Lucro (se vender) |
|-----|-------------|--------|---------------|----------------|----------|-----|-------------------|

- Each row is clickable to expand with more detail
- Rows for years 10, 20, 30 have a slightly different background to stand out

**Chart 1 — Fluxo de Caixa Anual** (bar chart or line chart using Recharts)
- X-axis: years 1–30
- Y-axis: R$ fluxo de caixa anual
- Show positive bars as green, negative as red

**Chart 2 — Patrimônio Acumulado** (stacked area chart using Recharts)
- X-axis: years 1–30
- Areas: Equity (teal) stacked over Dívida Restante (light gray)
- Line: Valor do Imóvel (dashed navy)

**Assumptions box** (collapsible, shown at bottom):
- Valorização: X% a.a.
- Crescimento do Aluguel: X% a.a.
- Custo de Venda: X%
- Editar link → opens wizard at step 6

### TAB 4 — Comparáveis (Comps)

Since there's no automatic API for Brazilian comps, implement a **manual comparable input system**.

**Sales Comps (Comparáveis de Venda)**:
- Button: "+ Adicionar Comparável de Venda"
- Modal/inline form: Address, Price, Area (m²), Bedrooms, Sale Date, Distance (km), Notes
- Table showing added comps with: Address, Price/m², Total Price, Date, Distance
- **ARV Estimate**: average price/m² of added comps × subject property area (auto-calculated)
- Summary stats: Median price/m², Average price/m², Range

**Rental Comps (Comparáveis de Aluguel)**:
- Same structure but for rental listings
- Fields: Address, Monthly Rent, Area, Bedrooms, Listing Date
- **Rent Estimate**: average rent/m² × subject property area (auto-calculated)

Both comp tables must be saveable — store in `deal.comps` JSON column in Supabase (add this migration).

### TAB 5 — Relatório (Report)

**Report Types** (radio selection):
1. **Relatório Completo** — all sections
2. **One-Pager (Resumo Executivo)** — 1-page summary
3. **Análise de Viabilidade** — analysis + projections only (no comps)

**Section Toggles** (checkboxes, only for Relatório Completo):
- [ ] Foto e mapa do imóvel
- [ ] Resumo financeiro (KPIs)
- [ ] Planilha de compra detalhada
- [ ] Análise de despesas
- [ ] Projeções de longo prazo (tabela + gráficos)
- [ ] Comparáveis adicionados manualmente
- [ ] Premissas e hipóteses
- [ ] Notas do analista

**Sharing Options**:
- **Baixar PDF** button (existing `DownloadPDFButton` — enhance it to use the selected report type and sections)
- **Link Compartilhável** button (existing `ShareButton` — keep as is)
- **Copiar Link** — copy to clipboard

---

## TASK 5 — Update the Dashboard (Property List)

**File:** `src/components/dashboard/DealCard.tsx` and `src/components/properties/PropertiesPage.tsx`

Each deal card in the dashboard must show:
- Property name
- City/neighborhood (if available)
- Property type badge
- **Fluxo de Caixa mensal** (green if positive, red if negative)
- **Cap Rate** (%)
- **Cash-on-Cash** (%)
- **Rent-to-Value** (% a.m.) — with color coding
- Strategy badge (Aluguel / BRRRR / Flip / Airbnb)
- Last updated date

The dashboard page must have:
- Header with "+ Nova Análise" button (prominent, leads to `/deals/new`)
- Filter/sort controls: sort by Cap Rate, Cash Flow, Rent-to-Value, Date
- Empty state: if no deals, show a clear call-to-action to add the first property

---

## TASK 6 — Supabase Migration

The `deals` table needs a new `comps` column to store manually added comparables.

Run this migration via the Supabase MCP tools (if available) or create a file at `supabase/migrations/[timestamp]_add_comps_column.sql`:

```sql
ALTER TABLE deals ADD COLUMN IF NOT EXISTS comps jsonb DEFAULT '{"sales": [], "rentals": []}';
```

Also ensure the existing `inputs` column can hold the expanded `DealInputs` type (it should already be `jsonb`, no schema change needed for the inputs expansion).

---

## TASK 7 — Navigation & Routing

1. **`/deals/new`** → should no longer use the old `AddDealSidebar` + separate type picker. The new Wizard's Step 1 has the strategy selector built in. Remove the sidebar entirely from this page. The page should just render `<AddDealWizard />`.

2. **After wizard save** → `router.push('/imoveis/' + newDealId)`. The property detail page must receive a `?tab=analise` query param (or just default to the Análise tab). Implement via `useSearchParams` on the detail page.

3. **`/propriedades`** → the main dashboard. Currently it shows the `PropertiesPage` component — update it to show the enhanced DealCard grid.

4. **`/imoveis/[id]/edit`** → already exists. Make sure the edit page pre-fills the wizard with all the new fields from the saved deal.

---

## TASK 8 — Real-Time Calculation Preview in Wizard

On **Steps 4 and 5**, add a **live results sidebar panel** (or a sticky bottom bar on mobile) that shows the key metrics updating in real-time as the user types:

```
┌─────────────────────────────┐
│ Análise em Tempo Real        │
├─────────────────────────────┤
│ Fluxo de Caixa    R$ XXX/mês│
│ Cap Rate          X.XX%     │
│ Cash-on-Cash      X.XX%     │
│ Rent-to-Value     X.XX% a.m.│
│ NOI               R$ XXX/mês│
│ Parcela           R$ XXX/mês│
└─────────────────────────────┘
```

Use `useWatch` from `react-hook-form` to compute metrics on every form value change without triggering validation.

---

## Implementation Notes

### Do NOT break:
- The existing `ShareButton` and public report at `/r/[slug]`
- The existing `DownloadPDFButton`
- The existing URL import / listing parser at `/api/parse-listing`
- The existing Supabase auth flow
- The existing `BrazilianAnalysis` component (keep it but make it the content of the Analysis tab Block F — benchmark section)

### Styling conventions (from existing code):
- Primary green: `#1a5c3a` (text) / `#ebf3ee` (background)
- Borders: `border-[#e5e5e3]`
- Cards: `rounded-xl border border-[#e5e5e3] bg-white`
- Text primary: `text-[#1c2b20]`
- Text muted: `text-[#737373]`
- Page background: `bg-[#F8F7F4]`
- Use `CurrencyInput` for all BRL monetary inputs
- All currency formatting: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- All percentage formatting: `${value.toFixed(2)}%`

### Key Brazilian market benchmarks (hardcode as constants):
```typescript
export const BR_BENCHMARKS = {
  capRate: { good: 5, ok: 3.5, bad: 0 },          // % a.a.
  cashOnCash: { good: 6, ok: 4, bad: 0 },          // % a.a.
  rentToValue: { good: 0.5, ok: 0.35, bad: 0 },   // % a.m.
  grmMonths: { good: 200, ok: 250, bad: 999 },     // months (lower is better)
  dscr: { good: 1.3, ok: 1.1, bad: 0 },
  ltv: { good: 70, ok: 80, bad: 100 },             // % (lower is better)
  breakEven: { good: 75, ok: 85, bad: 100 },       // % (lower is better)
};
```

---

---

## TASK 9 — Financing Simulator Tab (Simulador de Financiamento)

### Purpose

An investor's core question is: **"Given what this property earns, which financing scenario leaves me with positive cash flow — and by how much?"** This tab answers that question visually and instantly.

It lives inside the Property Detail Page as a **new tab** between "Análise" and "Projeções":

```
[Resumo]  [Análise]  [Financiamento]  [Projeções]  [Comparáveis]  [Relatório]
```

The tab has two modes the user can toggle between:
- **Simulador** — tweak a single financing scenario interactively
- **Comparar** — side-by-side comparison of up to 4 scenarios

---

### New calculation utility

**File:** `src/lib/calculations/financing.ts`

Add a new exported function `simulateFinancing()` alongside the existing `calculateAmortization()`:

```typescript
export interface FinancingScenario {
  id: string;
  label: string;              // user-defined name, e.g. "Banco do Brasil – SAC"
  purchasePrice: number;      // always the same as the deal
  downPayment: number;        // entrada R$
  interestRateYear: number;   // % a.a.
  termMonths: number;         // prazo em meses
  system: AmortizationSystem; // SAC | PRICE
  modality?: FinancingModality;
}

export interface FinancingSimulationResult {
  scenarioId: string;
  label: string;
  loanAmount: number;           // purchasePrice - downPayment
  downPaymentPercent: number;   // downPayment / purchasePrice * 100
  ltv: number;                  // loanAmount / purchasePrice * 100

  // Month 1 installment (most important for cash flow)
  firstInstallment: number;

  // For SAC: last installment (minimum). For PRICE: same as first.
  lastInstallment: number;

  // Average installment over full term
  averageInstallment: number;

  totalPaid: number;            // sum of all installments
  totalInterest: number;        // totalPaid - loanAmount
  totalInterestPercent: number; // totalInterest / loanAmount * 100

  // ── The core investor verdict ────────────────────────────────────────────
  // These use the deal's NOI (from saved results_cache.metrics.monthlyNOI)
  // If no NOI is available, these are null.

  monthlyNOI: number | null;         // from deal's saved analysis
  cashFlowMonth1: number | null;     // monthlyNOI - firstInstallment
  cashFlowAverage: number | null;    // monthlyNOI - averageInstallment
  cashFlowYear1Annual: number | null; // cashFlowMonth1 * 12
  dscr: number | null;               // monthlyNOI / firstInstallment
  cashOnCash: number | null;         // (cashFlowMonth1 * 12) / (downPayment + acquisitionCosts) * 100
  isProfitable: boolean | null;      // cashFlowMonth1 > 0

  // Break-even: what monthly rent is needed to have cashFlow = 0?
  breakEvenRent: number;             // firstInstallment + monthlyOperatingExpenses

  // Payback on down payment (years to recover entrada via cash flow)
  paybackYears: number | null;       // downPayment / (cashFlowYear1Annual)

  // Full amortization schedule (used for charts)
  schedule: AmortizationPeriod[];
}

export function simulateFinancing(
  scenario: FinancingScenario,
  monthlyNOI: number | null,
  monthlyOperatingExpenses: number,
  acquisitionCosts: number,
): FinancingSimulationResult
```

Logic inside `simulateFinancing()`:
- Call existing `calculateAmortization(loanAmount, interestRateYear, termMonths, system)` for the schedule
- Derive all fields from the schedule + NOI
- For `cashFlowMonth1`: `monthlyNOI - schedule[0].installment` (null if no NOI)
- For `breakEvenRent`: `schedule[0].installment + monthlyOperatingExpenses`
- For `dscr`: `monthlyNOI / schedule[0].installment` (null if no NOI or installment = 0)

---

### MODE 1 — Simulador (Single Scenario)

Full-width interactive panel. All inputs update the results in real-time with no submit button.

**Left column — Inputs (40% width):**

```
PROPRIEDADE
Preço de Compra:  R$ [readonly — from deal]
NOI Mensal:       R$ [readonly — from deal's saved analysis]

CENÁRIO DE FINANCIAMENTO
Entrada (R$)      [CurrencyInput]  [= X% do imóvel — live badge]
Taxa de Juros     [number input]  % a.a.
Prazo             [slider + number] meses    [= X anos]
Sistema           [SAC]  [PRICE]  — pill toggle
Modalidade        [SFH]  [SFI]  [Consórcio]  [Outro] — pill selector
```

**Right column — Results (60% width):**

This is the "verdict panel". Layout:

```
┌────────────────────────────────────────────────────────┐
│  VALOR FINANCIADO      R$ XXX.XXX       LTV: XX%       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  PARCELA (MÊS 1)        R$ X.XXX/mês                  │
│  (SAC: diminui até R$ X.XXX no mês final)              │
│                                                        │
│  ─────────────────────────────────────────────────── │
│                                                        │
│  NOI MENSAL             R$ X.XXX/mês   [from analysis] │
│  (–) PARCELA            R$ X.XXX/mês                  │
│  ─────────────────────────────────────────────────── │
│  FLUXO DE CAIXA         R$ X.XXX/mês   ← BIG + COLOR  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ✅ LUCRATIVO  — sobra R$ XXX/mês após a parcela │ │
│  │  ou                                              │ │
│  │  ❌ NÃO LUCRATIVO — falta R$ XXX/mês              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Aluguel de Break-even:   R$ X.XXX/mês                │
│  DSCR:                    X.XX   [badge: Bom/Ruim]    │
│  Cash-on-Cash:            X.XX%  a.a.                 │
│  Payback da Entrada:      XX anos                     │
│                                                        │
└────────────────────────────────────────────────────────┘

CUSTO TOTAL DO FINANCIAMENTO
  Valor financiado:      R$ XXX.XXX
  Total de parcelas:     R$ XXX.XXX
  Total de juros:        R$ XXX.XXX  (XX% do principal)
  Prazo:                 XXX meses (XX anos)
```

**Below the verdict panel — Installment Chart:**

A line chart (Recharts `LineChart`) showing installment evolution over the loan term:
- X-axis: years (0 to term in years)
- Y-axis: R$ installment value
- For SAC: descending line from first to last installment
- For PRICE: flat horizontal line
- Add a horizontal dashed line at `monthlyNOI` with label "Seu NOI"
- The area between the NOI line and the installment line should be shaded:
  - Green fill when installment < NOI (profitable zone)
  - Red fill when installment > NOI (loss zone)
- This chart makes it instantly visual when the investment becomes profitable for SAC loans

**Below the chart — Amortization Schedule Table (collapsible):**

Collapsed by default. When expanded, shows a paginated table (12 rows = 1 year per page):

| Mês | Parcela | Juros | Amortização | Saldo Devedor |
|-----|---------|-------|-------------|---------------|

Show totals row at bottom: Total Parcelas / Total Juros / Total Amortizado.

---

### MODE 2 — Comparar (Multi-Scenario Comparison)

Toggle at the top of the tab: `[Simulador]  [Comparar]`

The user can add up to **4 scenarios** side by side. Each scenario is a card.

**Adding a scenario:**
- "+" button adds a new scenario card
- New cards are pre-filled with the deal's existing financing data as a starting point
- Each card has a title input (e.g. "Banco do Brasil", "Caixa – SAC", "À Vista")
- Each card has the same inputs as the Simulador mode
- A "×" button removes the scenario (minimum 1 scenario always remains)

**Comparison layout:**

For 2 scenarios: two columns side by side.
For 3–4 scenarios: responsive grid.

Each scenario card shows:
```
┌──────────────────────────────┐
│ [Scenario Name]   ×          │
│ ─────────────────────────── │
│ Entrada:    R$ XXX (XX%)     │
│ Taxa:       XX% a.a.         │
│ Prazo:      XXX meses        │
│ Sistema:    SAC / PRICE      │
│ ─────────────────────────── │
│ Parcela (Mês 1):  R$ X.XXX  │
│ ─────────────────────────── │
│ NOI:              R$ X.XXX  │
│ (–) Parcela:      R$ X.XXX  │
│ ─────────────────────────── │
│ FLUXO DE CAIXA               │
│ R$ X.XXX/mês                │  ← big, green or red
│                               │
│ ✅ LUCRATIVO                 │  ← verdict badge
│                               │
│ DSCR:       X.XX             │
│ CoC:        X.XX% a.a.       │
│ Payback:    XX anos          │
│ Total Juros: R$ XXX.XXX      │
└──────────────────────────────┘
```

**Below the cards — Comparison Summary Table:**

A horizontal table comparing all scenarios on the most important metrics:

| Métrica | Cenário 1 | Cenário 2 | Cenário 3 | Cenário 4 |
|---------|-----------|-----------|-----------|-----------|
| Entrada | R$ X | R$ X | R$ X | R$ X |
| LTV | XX% | XX% | XX% | XX% |
| Parcela Mês 1 | R$ X | R$ X | R$ X | R$ X |
| **Fluxo de Caixa** | **R$ X** | **R$ X** | **R$ X** | **R$ X** |
| **Lucrativo?** | ✅ | ❌ | ✅ | ✅ |
| DSCR | X.XX | X.XX | X.XX | X.XX |
| Total de Juros | R$ X | R$ X | R$ X | R$ X |
| Cash-on-Cash | X% | X% | X% | X% |

Highlight the best value in each row with a subtle green background.
Highlight the worst value in each row with a subtle red background.

**Below the table — Comparison Chart (Recharts):**

A grouped bar chart showing Cash Flow by scenario:
- X-axis: scenario names
- Bars: one bar per scenario, colored green (positive CF) or red (negative CF)
- Add a horizontal baseline at 0
- Tooltip shows full breakdown on hover

---

### State Management for Scenarios

Scenarios are **local state only** (no Supabase save). Use `useState` with an array of `FinancingScenario[]`. On tab mount, initialize with one scenario pre-filled from `deal.inputs.financing` (if it exists).

```typescript
// Default scenario shape when adding a new one:
const DEFAULT_SCENARIO: Omit<FinancingScenario, 'id'> = {
  label: 'Novo Cenário',
  purchasePrice: deal.inputs.purchasePrice,
  downPayment: deal.inputs.financing?.downPayment ?? deal.inputs.purchasePrice * 0.2,
  interestRateYear: 10.5,
  termMonths: 360,
  system: 'SAC',
  modality: 'SFH',
};
```

Use `nanoid()` or `crypto.randomUUID()` for scenario IDs.

---

### Integration with existing deal data

The `monthlyNOI` and `monthlyOperatingExpenses` values must come from `deal.results_cache?.metrics`:

```typescript
const monthlyNOI = deal.results_cache?.metrics?.monthlyNOI ?? null;
const monthlyOperatingExpenses = deal.results_cache?.metrics?.operatingExpenses ?? null;
const acquisitionCosts = deal.results_cache?.metrics?.totalAcquisitionCosts ?? 0;
```

If `results_cache` is null (deal imported via URL without running the wizard), show a banner:

```
⚠️ Execute a análise completa deste imóvel para ver o fluxo de caixa.
[Analisar Imóvel →]  (links to edit page / wizard)
```

The financing simulator still works without NOI — it shows loan mechanics (parcelas, total juros, schedule) but the cash flow and profitability fields show "–" until the analysis is run.

---

### Component file

Create **`src/components/deals/tabs/FinanciamentoTab.tsx`** as a self-contained client component.

Internal structure:
```
FinanciamentoTab
 ├── ModeToggle (Simulador / Comparar)
 ├── SimuladorMode
 │    ├── ScenarioInputs
 │    ├── VerdictPanel
 │    ├── InstallmentChart (Recharts)
 │    └── AmortizationScheduleTable (collapsible)
 └── CompararMode
      ├── ScenarioCardList
      │    └── ScenarioCard[] (up to 4)
      ├── ComparisonSummaryTable
      └── CashFlowComparisonChart (Recharts)
```

Import it in `DealDetailView.tsx` and render it when `activeTab === 'financiamento'`.

---

## Prioritization

If you need to prioritize, implement in this order:

1. **TASK 1** (types) + **TASK 2** (calculations) — foundation
2. **TASK 3** (wizard) — most user-facing value
3. **TASK 4 Tabs 1+2** (Summary + Analysis tabs) — immediately visible after wizard
4. **TASK 7** (routing/redirect after save) — the "aha moment"
5. **TASK 9** (Financing Simulator tab) — high investor value, self-contained
6. **TASK 4 Tab 3** (Projections tab)
7. **TASK 5** (Dashboard cards)
8. **TASK 8** (Real-time preview in wizard)
9. **TASK 4 Tab 4** (Comps) + **TASK 6** (Migration)
10. **TASK 4 Tab 5** (Report tab enhancements)

---

Start with TASK 1. Read each task fully before coding. Ask no clarifying questions — make reasonable decisions and document them as inline comments.
