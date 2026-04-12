# ImmoYield — Analysis System Integration Plan

> **Scope**: Everything that touches a number about a property — from the moment data enters the form to every screen that displays a result.
> **Goal**: One source of truth for calculations, one shared scoring engine, and two complete output surfaces (Results page + Detail page) that tell the same story consistently.

---

## The Full System Map

```
[Link Extraction]  [Manual Form]
       └──────────────┘
              │
       /analyze (form)
              │  sessionStorage
              ▼
        /results page
         Full analysis output
         ImmoScore · Charts · Export · Insights

[Supabase opportunities table]
  computed fields: immoScore, yieldPercent,
  cashflowMonthly, paybackYears
              │
              ▼
  /opportunities/[id]  (detail page)
   Pre-computed snapshot + Insights
   CTA → passes data → /analyze → /results
```

The two output surfaces (**Results page** and **Detail page**) must draw from the **same calculation and scoring functions**. Right now they are completely disconnected.

---

## What's Broken Today (Diagnosis)

### 1. `getScoreLabel()` — Empty in 2 files
Both `app/opportunities/page.tsx` and `app/opportunities/[id]/page.tsx` define `getScoreLabel()` as an empty function body that returns nothing. Every score badge on every card and every detail page is invisibly broken.

### 2. `computeImmoScore()` — Doesn't exist
`immoScore` is a hardcoded random number in mock data (85, 82, 88…). There is no algorithm. The score means nothing until it's computed from real financial inputs.

### 3. `AnalysisResults` type — Missing critical fields
`lib/calculations.ts` doesn't output:
- `paybackYears` (years to recoup full investment from cashflow)
- `netYieldPercent` (cap rate expressed as net yield %)
- `immoScore` (0–100)
- `yearlyProjections[]` (needed for charts)
- Rule-based `insights` and `risks` strings

### 4. Results page — 3 dead features
- "Exportar" button fires nothing
- No chart rendered anywhere
- `monthlyServices` and `monthlySuggestion` are editable on the results page but **do not feed back into `results.monthlyCashFlow`** — the displayed cashflow is always stale

### 5. Detail page — 2 empty stub sections
`"Por que é interessante"` and `"Riscos"` render a single empty `<li>`. The TODO comment says "Generate with AI" but a rule-based v1 is faster, more reliable, and sufficient.

### 6. Utility functions duplicated across 4 files
`formatCurrency` is defined identically in `opportunities/page.tsx`, `opportunities/[id]/page.tsx`, and `portfolio/page.tsx`. `lib/format.ts` exists with `formatBRL` but isn't used consistently.

### 7. `condoFee` not passed through query params
The "Analisar" CTA on the detail page builds a URL like `?price=X&estimatedRent=X&condoFee=X` — but the `useEffect` in `AnalyzeClient.tsx` only reads `price`, `estimatedRent`, `iptuAnnual`, and `city`. `condoFee` is silently dropped.

---

## The Target Architecture

### Shared Layer (`lib/`)

```
lib/
  calculations.ts        ← EXTEND: add payback, net yield, yearly projections
  scoring.ts             ← NEW: computeImmoScore(), getScoreLabel(), getScoreColor()
  insights.ts            ← NEW: generateInsights(), generateRisks() (rule-based)
  format.ts              ← EXTEND: consolidate formatCurrency here, remove duplicates
```

### Types (`types/property.ts`)

```typescript
// EXTEND AnalysisResults with:
yearlyProjections: YearlyProjection[]   // 10 data points for charts
paybackYears: number
netYieldPercent: number
immoScore: number
insights: string[]
risks: string[]
```

### Results Page (`/results`)
- Reads full `AnalysisResults` including score, insights, risks, projections
- Renders cashflow chart + appreciation chart (Recharts)
- Export to PDF via `window.print()` with a print-specific CSS stylesheet
- Live recalculation when user edits assumptions inline

### Detail Page (`/opportunities/[id]`)
- Renders score badge using shared `getScoreLabel()` from `lib/scoring.ts`
- Renders insights/risks from shared `generateInsights()` / `generateRisks()`
- Passes `condoFee` correctly in "Analisar" query params

---

## Section-by-Section Checklist

---

### STEP 1 — Build the Shared Library Foundation
*Do this first. Everything else depends on it.*

#### `lib/scoring.ts` (NEW FILE)

- [ ] 🔴 Create `computeImmoScore(results: AnalysisResults, input: PropertyAnalysis): number`
  
  **Algorithm (0–100):**
  | Component | Max pts | Logic |
  |---|---|---|
  | Net yield (cap rate) | 35 | ≥8% → 35, 6–8% → 25, 4–6% → 14, <4% → 4 |
  | Cashflow | 25 | Positive → 25, 0 → 10, Negative → 0 |
  | Payback period | 20 | <12yr → 20, 12–15yr → 13, 15–20yr → 6, >20yr → 0 |
  | Expense ratio | 15 | (condo+iptu/12)/rent < 20% → 15, <35% → 9, <50% → 4, >50% → 0 |
  | Data completeness | 5 | All fields filled → 5, partial → 2, minimal → 0 |

- [ ] 🔴 Create `getScoreLabel(score: number): { label: string; color: string; bgColor: string }`
  
  ```
  ≥85  → { label: 'Excelente', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' }
  70–84 → { label: 'Bom',       color: 'text-blue-700',   bgColor: 'bg-blue-50 border-blue-200' }
  55–69 → { label: 'Regular',   color: 'text-amber-700',  bgColor: 'bg-amber-50 border-amber-200' }
  <55  → { label: 'Baixo',     color: 'text-red-700',    bgColor: 'bg-red-50 border-red-200' }
  ```

- [ ] Remove the two empty `getScoreLabel()` stubs from `opportunities/page.tsx` and `opportunities/[id]/page.tsx` and import from `lib/scoring.ts`

#### `lib/insights.ts` (NEW FILE)

- [ ] 🔴 Create `generateInsights(input: PropertyAnalysis, results: AnalysisResults): string[]`

  Rule-based logic — return 2–4 bullet strings. Examples:
  ```
  results.capRate >= 7       → "Rentabilidade líquida acima da média de mercado (≥7%)"
  results.monthlyCashFlow > 0 → "Fluxo de caixa positivo desde o primeiro mês"
  results.paybackYears < 13  → `Payback estimado em ${X} anos — abaixo de 13 anos é considerado excelente`
  input.condoFeeMonthly < input.monthlyRent * 0.15 → "Condomínio baixo preserva margem operacional"
  results.immoScore >= 80    → "ImmoScore alto — imóvel classificado como boa oportunidade de investimento"
  ```

- [ ] 🔴 Create `generateRisks(input: PropertyAnalysis, results: AnalysisResults): string[]`

  Rule-based logic — return 2–3 risk strings. Examples:
  ```
  results.monthlyCashFlow < 0       → "Fluxo de caixa negativo — exige aporte mensal do investidor"
  (condoFee/rent) > 0.30            → "Condomínio alto representa mais de 30% do aluguel"
  results.paybackYears > 18         → `Payback longo (${X} anos) — acima da média recomendada`
  input.vacancyRate >= 8            → "Taxa de vacância elevada pode comprometer a rentabilidade"
  !input.condoFeeMonthly            → "Condomínio não informado — cálculo pode estar subestimado"
  results.capRate < 5               → "Cap rate abaixo de 5% — rentabilidade inferior à renda fixa"
  ```

#### `lib/calculations.ts` (EXTEND)

- [ ] 🔴 Add `YearlyProjection` type and `yearlyProjections` to output:
  ```typescript
  type YearlyProjection = {
    year: number;
    propertyValue: number;
    cumulativeCashFlow: number;
    totalReturn: number; // appreciation + cumulative cashflow
  }
  ```
- [ ] 🔴 Add `paybackYears` to `calculateAnalysis()` output:
  ```typescript
  const paybackYears = results.annualCashFlow > 0
    ? (data.purchasePrice + data.closingCosts) / results.annualCashFlow
    : Infinity;
  ```
- [ ] 🔴 Add `netYieldPercent` (same as capRate but named clearly for display):
  ```typescript
  const netYieldPercent = capRate; // alias for clarity in UI
  ```
- [ ] Add `yearlyProjections`: loop 1–10, compound appreciation × price, accumulate cashflow
- [ ] Update `AnalysisResults` type in `types/property.ts` to include all new fields

#### `lib/format.ts` (EXTEND)

- [ ] Add `formatCurrency(value: number): string` as an alias for `formatBRL` (for backward compat)
- [ ] Remove the 3 duplicate inline `formatCurrency` definitions from `opportunities/page.tsx`, `opportunities/[id]/page.tsx`, and `portfolio/page.tsx` — import from `lib/format.ts` instead

---

### STEP 2 — Fix the Analysis Form (`/analyze`)

- [ ] 🔴 Fix `condoFee` query param: in `AnalyzeClient.tsx` `useEffect`, add:
  ```typescript
  const condoFee = searchParams?.get('condoFee');
  if (condoFee) setFormData(prev => ({ ...prev, condoFeeMonthly: parseFloat(condoFee) }))
  ```
- [ ] 🔴 Make `condoFeeMonthly` and `iptuYearly` editable (remove `disabled` prop). Add helper text: *"Extraído automaticamente — pode editar se necessário"*
- [ ] 🔴 Remove the duplicate "Custos oficiais" Card section (lines ~388–413 in AnalyzeClient.tsx repeat the same two fields already shown in "Custo mensal estimado")
- [ ] Add live cashflow preview in the sticky bottom bar:
  ```
  [Recalcular] — Cashflow estimado: R$ X.XXX/mês
  ```
  Compute it inline from `formData` using `calculateAnalysis()` on every change
- [ ] Add auto-save: on every `formData` change, `localStorage.setItem('analysisDraft', JSON.stringify(formData))`. On mount, if a draft exists, show a dismissible banner: *"Você tem um rascunho salvo. Restaurar?"*

---

### STEP 3 — Complete the Results Page (`/results`)

#### Fix the calculation disconnect
- [ ] 🔴 Remove `monthlyServices` and `monthlySuggestion` editable state from results page — these fields belong only in the form. On results, show what was calculated; add an "Editar premissas" button that navigates back to `/analyze` with sessionStorage intact.

#### Add ImmoScore to results
- [ ] 🔴 Import `computeImmoScore` and `getScoreLabel` from `lib/scoring.ts`
- [ ] 🔴 Compute score: `const score = computeImmoScore(results, analysis)`
- [ ] 🔴 Display score at the top of the results page — large pill badge with color + label + number. Place it in the header section above the 4 metric cards.
- [ ] Show score explanation: collapsible section "Como o ImmoScore é calculado" listing each component and how many points this property got

#### Add insights and risks to results
- [ ] 🔴 Import `generateInsights` and `generateRisks` from `lib/insights.ts`
- [ ] 🔴 Add an "Análise qualitativa" section below the monthly breakdown:
  - Left card: "Pontos positivos" with emerald bullets
  - Right card: "Atenção" with amber bullets

#### Add charts
- [ ] 🔴 Install/confirm `recharts` is available (it's in the React artifact allowlist)
- [ ] 🔴 Add **Cashflow Acumulado** bar chart:
  - X axis: Anos 1–10
  - Y axis: R$ (cumulative cashflow)
  - Each bar shows total cash returned to investor by that year
- [ ] Add **Valorização do Imóvel** line chart:
  - X axis: Anos 1–10
  - Y axis: R$ property value
  - Based on `appreciationRate` compounding from `yearlyProjections`

#### Wire up export
- [ ] 🔴 Add a `print.css` stylesheet (or `@media print` block in `globals.css`) that:
  - Hides nav, header buttons, action buttons
  - Expands all sections
  - Adds ImmoYield logo header
  - Forces white background
- [ ] 🔴 Wire "Exportar" button: `onClick={() => window.print()}`
- [ ] Add page title before print: `document.title = `Análise — ${analysis.address}``

#### Add payback years to results
- [ ] Add `paybackYears` MetricCard in the 4-card row (replace or add a 5th card below):
  ```
  title: "Payback"
  value: `${results.paybackYears.toFixed(1)} anos`
  subtitle: "Retorno do capital investido"
  ```

---

### STEP 4 — Complete the Detail Page (`/opportunities/[id]`)

- [ ] 🔴 Import `getScoreLabel` from `lib/scoring.ts` (remove the empty stub)
- [ ] 🔴 Implement insights from `lib/insights.ts`:
  Since the detail page works from pre-computed opportunity fields (not a full `PropertyAnalysis`), build a lightweight adapter:
  ```typescript
  // Inside the detail page, construct minimal inputs
  const partialAnalysis = {
    purchasePrice: opportunity.price,
    monthlyRent: opportunity.estimatedRent,
    condoFeeMonthly: opportunity.condoFee,
    iptuYearly: opportunity.iptuAnnual,
    vacancyRate: 5, // default
  }
  const partialResults = {
    capRate: opportunity.yieldPercent,
    monthlyCashFlow: opportunity.cashflowMonthly,
    paybackYears: opportunity.paybackYears,
  }
  const insights = generateInsights(partialAnalysis, partialResults)
  const risks = generateRisks(partialAnalysis, partialResults)
  ```
- [ ] 🔴 Render the `insights` array into the "Por que é interessante" `<ul>` list
- [ ] 🔴 Render the `risks` array into the "Riscos" `<ul>` list
- [ ] Fix the not-found JSX: add proper content inside the Card (message + back link)
- [ ] Fix "Analisar" CTA URL to include `condoFee`:
  ```typescript
  const analyzeUrl = `/analyze?price=${opportunity.price}&estimatedRent=${opportunity.estimatedRent}&condoFee=${opportunity.condoFee || 0}&iptuAnnual=${opportunity.iptuAnnual || 0}&city=${encodeURIComponent(opportunity.city)}`
  ```
  (It already has `condoFee` in the URL — but Step 2 above must fix the form to actually read it)
- [ ] Add a "ImmoScore" computed badge using `getScoreLabel(opportunity.immoScore)` — replaces the current broken badge
- [ ] Add `paybackYears` to the metrics row on the detail page (currently missing from MetricCard grid)

---

### STEP 5 — Consistency Pass

- [ ] Verify `immoScore` stored on each opportunity record in Supabase is computed by the same `computeImmoScore()` function (seed script or migration should call it)
- [ ] Ensure the detail page score badge and results page score badge show identical values for the same property when routed through "Analisar"
- [ ] Add a shared `<ScoreBadge score={n} />` component to `components/shared/` so the badge is pixel-identical in cards, detail page, and results page
- [ ] End-to-end smoke test path:
  1. Open `/opportunities` → see score badges on cards ✓
  2. Click a card → detail page shows score, insights, risks ✓
  3. Click "Executar análise" → form pre-filled with correct values including condoFee ✓
  4. Submit form → results page shows score, charts, insights, export ✓
  5. Click "Exportar" → print dialog opens with clean layout ✓

---

## Implementation Order (Critical Path)

```
Day 1
  ├── lib/scoring.ts        (getScoreLabel + computeImmoScore)
  ├── lib/insights.ts       (generateInsights + generateRisks)
  └── lib/calculations.ts   (extend with payback, netYield, yearlyProjections)

Day 2
  ├── types/property.ts     (extend AnalysisResults)
  ├── Fix AnalyzeClient.tsx (condoFee param, remove disabled, remove duplicate card)
  └── Fix detail page       (import from lib, fill insights, fix JSX, fix score badge)

Day 3
  ├── Results page          (score section, insights section, charts, export)
  └── Shared ScoreBadge component

Day 4
  └── Consistency pass + smoke test all 5 steps above
```

---

## What "Perfect" Looks Like

**Results Page** after completing the form:
1. ImmoScore badge (colored, labeled) — top of page
2. Recommendation sentence: *"Este imóvel tem ImmoScore 82 (Bom). Fluxo de caixa positivo e cap rate acima da média."*
3. 4 metric cards: Cashflow mensal · Cashflow anual · Retorno sobre capital · Taxa de capitalização
4. Payback card: *"12.4 anos"*
5. Monthly breakdown table (already built)
6. Charts: Cashflow acumulado (bar) · Valorização (line)
7. Pontos positivos + Atenção cards (from `generateInsights` / `generateRisks`)
8. Export button → clean PDF via `window.print()`

**Detail Page** for a listed opportunity:
1. Hero image + ImmoScore badge (colored, labeled, computed)
2. 4 metric cards: Preço · Aluguel · Rentabilidade · Cashflow mensal
3. Financial breakdown table
4. "Por que é interessante" — 3 rule-based bullets (emerald)
5. "Riscos" — 2 rule-based bullets (amber)
6. "Executar análise" CTA → form pre-fills all 5 fields correctly

Both pages speaking the same language, using the same engine.
