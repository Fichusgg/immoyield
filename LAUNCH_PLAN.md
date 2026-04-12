# ImmoYield — First Build Launch Plan

> **Goal**: Ship a production-ready v1 that investors trust, enjoy, and return to.
> **Stack**: Next.js 14 · TypeScript · Tailwind CSS · Supabase
> **Market**: Brazilian real estate investors (PT-BR)
> **Differentiator**: AI-powered extraction + scoring + clean opinionated UX

---

## How to Read This Document

Each of the five sections maps directly to a page/feature. For each one you'll find:
- **Current State** — what's already built and what's broken
- **Competitor Benchmark** — what the best platforms do
- **Most Important Gaps** — the delta between now and launchable
- **Checklist** — ordered tasks, critical items marked 🔴
- **Deploy Criteria** — the minimum bar to ship that section

---

## 0. Cross-Cutting (must-haves before anything deploys)

### Competitor Benchmark
- Mashvisor, Roofstock, QuintoAndar all have real data, real images, and working auth
- Every competitor has a coherent design system with consistent score/badge colors
- Platforms like Rentastic and Landlord Studio use real-time calculation previews throughout

### Current State
- All data is **mock** — no Supabase connection anywhere
- `getScoreLabel()` function is **completely empty** in two files (returns nothing)
- Property card JSX has **broken rendering** (missing fragments, dangling spans)
- No user authentication
- No error boundaries or loading states

### Checklist

- [ ] 🔴 Implement `getScoreLabel()` with color tiers: `≥85 = Excelente (emerald)`, `70–84 = Bom (blue)`, `55–69 = Regular (amber)`, `<55 = Baixo (red)`
- [ ] 🔴 Fix broken JSX in `OpportunityCard` (missing wrapping div, stray spans)
- [ ] 🔴 Fix empty `<h1>` in opportunities page header
- [ ] 🔴 Fix incomplete `<Select>` in opportunities page (missing `value`, `onChange`, `options`, `label`)
- [ ] 🔴 Connect Supabase — create `opportunities` table and replace all mock data
- [ ] 🔴 Add real property images (use placeholder service like `picsum.photos` initially, migrate to Supabase Storage)
- [ ] Add basic error boundaries on each page
- [ ] Add loading skeleton states for data-fetching pages
- [ ] Set up environment variables properly (`.env.local` for dev, Vercel env vars for prod)
- [ ] Add `<head>` metadata (title, description, og:image) for each page
- [ ] Verify mobile responsiveness on 375px, 390px, 414px breakpoints

### Deploy Criteria
All 🔴 items above must be resolved. App must render without runtime errors on all 5 pages with at least 6 real or seeded properties.

---

## 1. Property Page (`/opportunities`)

The **discovery engine** — where investors find and filter investment opportunities ranked by ImmoScore.

### Competitor Benchmark

| Feature | Mashvisor | Roofstock | ImmoYield Current |
|---|---|---|---|
| Property Score / Rating | ✅ Property Score (0–100) | ✅ Roofstock Score | ⚠️ ImmoScore exists but `getScoreLabel` broken |
| Heatmap / Map View | ✅ City heatmaps | ✅ Map browse | ❌ Not built |
| Filters: yield, price, cashflow | ✅ | ✅ | ✅ Built (but Select incomplete) |
| Sort: score, yield, newest | ✅ | ✅ | ✅ Built |
| Positive cashflow filter | ✅ | ✅ | ✅ Built |
| Real images per card | ✅ | ✅ | ❌ Placeholder SVG |
| Pagination / infinite scroll | ✅ | ✅ Pagination | ❌ Not built |
| Saved / favorites | ✅ | ✅ | ❌ Not built |
| "New" badge / freshness | ✅ | ✅ | ❌ Not built |
| Number of bedrooms filter | ✅ | ✅ | ❌ Not built |
| Price/m² display | ✅ | ✅ | ❌ Not built |

### Current State
- Filter UI is built but Select component is wired incorrectly (city filter won't work)
- Card renders but JSX is broken (missing closing tags/elements)
- 6 hardcoded mock items
- No pagination
- No images (SVG placeholder)
- Sort dropdown options array is empty

### Most Important Gaps for Launch
1. Fix broken components (blockers)
2. Connect real data from Supabase
3. Add price/m² to card — investors always want this
4. Add bedrooms filter — most-used filter in Brazil
5. Add "Novo" badge for listings added in the last 7 days
6. Sort options must have labels (currently empty array)

### Checklist

**Blockers (must fix first)**
- [ ] 🔴 Fix `getScoreLabel()` — score badge must show on cards
- [ ] 🔴 Fix `OpportunityCard` JSX — card must render price, area, cashflow, score
- [ ] 🔴 Fix city `<Select>` — add `label`, `value`, `onChange`, `options` props correctly
- [ ] 🔴 Fix sort `<Select>` — `options` array is empty `[]`, add the four sort labels
- [ ] 🔴 Fix page `<h1>` — add "Oportunidades" or "Descubra imóveis rentáveis"

**Core functionality**
- [ ] 🔴 Connect to Supabase `opportunities` table (replace mock)
- [ ] Add bedrooms filter (1, 2, 3, 4+ quartos)
- [ ] Add price/m² to card display
- [ ] Add "Novo" badge (green dot) for listings < 7 days old
- [ ] Add correct sort option labels: `score→ImmoScore`, `yield→Rentabilidade`, `price→Menor preço`, `newest→Mais recente`

**Polish**
- [ ] Add property count in header ("127 oportunidades encontradas")
- [ ] Add empty state illustration (not just text)
- [ ] Add skeleton loading cards while fetching (3×2 grid of skeletons)
- [ ] On mobile: collapse advanced filters behind "Filtros avançados" toggle
- [ ] Add "Limpar filtros" button when any filter is active

### Deploy Criteria
- All 🔴 items done
- At least 10 seeded real-or-realistic properties in Supabase
- Filters all function correctly end-to-end
- Cards render score badge, price, yield, cashflow, area, location

---

## 2. Property Detail Page (`/opportunities/[id]`)

The **decision page** — investors spend the most time here deciding whether to pursue a property.

### Competitor Benchmark

| Feature | Mashvisor | Roofstock | ImmoYield Current |
|---|---|---|---|
| Photo gallery (multiple images) | ✅ | ✅ | ❌ Single placeholder image |
| Key metrics (4-card row) | ✅ | ✅ | ✅ Built |
| Full financial breakdown | ✅ | ✅ | ✅ Built |
| AI-generated "Why invest" | ❌ | ❌ | ⚠️ Section exists, content empty |
| AI-generated "Risks" | ❌ | ❌ | ⚠️ Section exists, content empty |
| Similar properties | ✅ | ✅ | ❌ Not built |
| Neighborhood stats | ✅ (heatmap) | ✅ | ❌ Not built |
| Share / save | ✅ | ✅ | ❌ Not built |
| Link to original listing | N/A | N/A | ✅ Built |
| "Analyze this property" CTA | N/A | N/A | ✅ Built |
| Score explanation tooltip | ✅ | ✅ | ❌ Not built |

### Current State
- Page structure is solid (back button, hero image, metrics, breakdown)
- `getScoreLabel()` empty — score badge shows no text/color
- "Por que é interessante" section is an empty `<li>` stub
- "Riscos" section is an empty `<li>` stub
- `scoreInfo` is used but the function returns nothing (runtime issue)
- Not-found state has broken JSX (missing content inside Card)

### Most Important Gaps for Launch
1. Fix `getScoreLabel()` — without it the score badge is invisible
2. Fill "Why invest" and "Risks" with real AI-generated content (or rule-based for v1)
3. Fix the not-found page broken JSX
4. Add photo gallery or at least real images

### Checklist

**Blockers**
- [ ] 🔴 Fix `getScoreLabel()` — same fix as Property Page
- [ ] 🔴 Fix not-found state JSX — add proper "Não encontrado" message and back button inside the Card
- [ ] 🔴 Fill "Por que é interessante" — generate 3 bullet points rule-based from property data (e.g. "Yield acima da média do bairro", "Fluxo de caixa positivo desde o dia 1", "Payback em menos de 12 anos")
- [ ] 🔴 Fill "Riscos" — generate 2–3 risk points rule-based (e.g. "Condomínio alto reduz margem", "Bairro sem dados históricos de vacância")

**Core functionality**
- [ ] Add score explanation: hoverable tooltip on ImmoScore showing what factors compose it
- [ ] Add "Compartilhar" (share) button — copy URL to clipboard
- [ ] Add "Salvar" (save/favorite) button — persist to localStorage for v1, Supabase later
- [ ] Add "Ver imóveis similares" section — 3 cards from same city/yield range

**Polish**
- [ ] Replace single SVG with a photo gallery component (carousel, 3–5 images)
- [ ] Add breadcrumb: Início → Oportunidades → [Property Name]
- [ ] Show area/m² price prominently in metrics row
- [ ] Add "Calculado em [data]" timestamp on analysis

### Deploy Criteria
- Score badge shows label + color on all properties
- "Por que é interessante" and "Riscos" sections have real content (rule-based is fine for v1)
- Not-found state works correctly
- CTA to analyze flows correctly to the form with pre-filled data

---

## 3. Form (`/analyze`)

The **input engine** — where investors enter or refine property data before getting their analysis. This is the highest-intent page in the funnel.

### Competitor Benchmark

| Feature | BiggerPockets Calculator | Rentastic | ImmoYield Current |
|---|---|---|---|
| Auto-save draft | ✅ | ✅ | ❌ Data lost on refresh |
| Real-time preview / live calc | ✅ | ✅ | ❌ Only calculates on submit |
| Sensible defaults | ✅ (e.g. vacancy 5%) | ✅ | ✅ Partial |
| Field tooltips / "what's this?" | ✅ | ✅ | ❌ Only helperText |
| Progress indicator (steps) | Some | ❌ | ❌ |
| Field validation inline | ✅ | ✅ | ✅ Built |
| "Typical value" hints | ✅ | ✅ | ❌ |
| condoFee pre-filled from listing | N/A | N/A | ⚠️ Extracted via API but disabled field |
| Mobile-friendly | ✅ | ✅ | ⚠️ Usable but not optimized |

### Current State
- Form is well-structured with 6 Card sections
- Validation is implemented for required fields
- Link mode switches to manual after extraction
- `condoFee` extracted from listing is **disabled** (non-editable) — this is wrong, user should be able to edit it
- `condoFeeMonthly` section duplicated in "Custos oficiais" and "Custo mensal estimado"
- Query param prefill works for price, rent, IPTU, city but **not for condoFee** (bug)
- No live preview of results as user types
- No auto-save — if user navigates away, all data is lost

### Most Important Gaps for Launch
1. Fix condoFee: make it editable and ensure it's passed correctly from query params
2. Remove duplicate condoFee card (appears twice)
3. Add auto-save to localStorage
4. Add "typical values" hints (e.g. "Vacância típica em SP: 4–6%")
5. Live total cashflow preview at the bottom of the form

### Checklist

**Blockers**
- [ ] 🔴 Fix `condoFee` not being passed in query param from opportunities page (the URL uses `condoFee=` but `useEffect` doesn't read it)
- [ ] 🔴 Make `condoFeeMonthly` and `iptuYearly` editable (remove `disabled` — these should be editable with a note "extraído automaticamente, pode editar")
- [ ] 🔴 Remove duplicate "Custos oficiais" card (it appears twice with the same fields)

**Core functionality**
- [ ] Add auto-save to `localStorage` — restore on page load with "Restaurar rascunho?" toast
- [ ] Add live cashflow preview at bottom of form: show estimated monthly cashflow updating as user types
- [ ] Fix vacancy rate: add tooltip "Média nacional ~5%. SP/RJ costumam ter 3–7%"
- [ ] Add typical value hints below key fields (property management "geralmente 8–10% do aluguel" already exists — add similar for insurance, maintenance)
- [ ] Consolidate "Custos oficiais" and "Custo mensal estimado" into a single section

**Polish**
- [ ] Add "Preencher com dados típicos" button to auto-fill insurance/maintenance/management with sensible Brazilian defaults
- [ ] Sticky bottom bar should show live cashflow estimate, not just the submit button
- [ ] Add form section anchors so user can jump to "Receitas", "Despesas" etc.
- [ ] On mobile: each Card section should be collapsible after filling

### Deploy Criteria
- condoFee flows correctly from listing → query params → form
- No duplicate sections in form
- Form submits successfully and navigates to /results
- Auto-save to localStorage works

---

## 4. Link Extraction (`/analyze?mode=link`)

The **magic feature** — paste a VivaReal or ZAP listing URL and the form fills automatically via AI. This is ImmoYield's key differentiator for v1.

### Competitor Benchmark
No competitor in Brazil offers this. International comparison:
- **Mashvisor**: imports from MLS listings automatically
- **DealCheck**: manual entry only, no scraping
- **ImmoYield**: already has Firecrawl + VivaReal parser + generic AI parser — **ahead of all Brazilian competitors**

### Current State
- Firecrawl integration is implemented
- VivaReal-specific parser built
- Generic AI parser (LLM-based) built
- Confidence scoring per field implemented
- After extraction, switches to manual mode — user can review and edit
- Error handling exists (URL validation, blocked hosts, parse failures)
- **No visual confidence indicator** — user doesn't know which fields were extracted vs which are missing
- **No supported sites list** — user doesn't know which portals work
- **No partial fill feedback** — if only price was extracted, user doesn't see what's missing

### Most Important Gaps for Launch
1. Show per-field confidence (green = extracted, yellow = estimated, grey = not found)
2. List supported portals upfront (VivaReal confirmed, ZAP, OLX, Imovelweb)
3. Better loading UX during extraction (takes 3–8 seconds with Firecrawl)
4. Handle the case where extraction partially works

### Checklist

**Blockers**
- [ ] 🔴 After extraction, `condoFeeMonthly` must be passed to the form state (currently it may be stuck as disabled)
- [ ] 🔴 Test end-to-end with a real VivaReal URL and verify the form pre-fills correctly

**Core functionality**
- [ ] Add confidence indicators on pre-filled fields: green checkmark icon for high confidence, yellow warning for low confidence, grey dash for not found
- [ ] Add "Portais suportados" note: "Funciona melhor com VivaReal e ZAP. Outros portais podem ter extração parcial."
- [ ] Improve loading state: animated progress bar with step labels ("Acessando anúncio...", "Lendo dados...", "Preenchendo formulário...")
- [ ] If extraction returns < 50% confidence, show a warning: "Extração parcial — confira os campos em branco antes de calcular"
- [ ] Add retry button if extraction fails

**Polish**
- [ ] Track which URL domains succeed/fail (log to Supabase for monitoring)
- [ ] Add "O que vai ser extraído?" expandable section (price, area, bedrooms, condo fee, IPTU, address)
- [ ] Cache extracted results for 30 mins to avoid duplicate Firecrawl calls for the same URL

### Deploy Criteria
- End-to-end test passes: paste a real VivaReal URL → form fills → navigate to results
- Error states display correctly (invalid URL, blocked host, parse failure)
- condoFee and IPTU correctly flow into editable form fields after extraction

---

## 5. Analysis / Results (`/results`)

The **payoff page** — the investor sees the full financial picture and decides to act. This page drives trust.

### Competitor Benchmark

| Feature | BiggerPockets | Rentastic | ImmoYield Current |
|---|---|---|---|
| Monthly cashflow breakdown | ✅ | ✅ | ✅ Built |
| Annual summary | ✅ | ✅ | ✅ Built |
| Cap rate | ✅ | ✅ | ✅ Built |
| Cash-on-cash return | ✅ | ✅ | ✅ Built |
| IRR (Internal Rate of Return) | ✅ | ✅ | ❌ Not built |
| Amortization / financing | ✅ | ❌ | ❌ Not built |
| Sensitivity table (what-if) | ✅ | ❌ | ❌ Not built |
| Chart: cashflow over time | ✅ | ✅ | ❌ Not built |
| Appreciation projection chart | ✅ | ❌ | ⚠️ 5yr/10yr values shown, no chart |
| PDF export | ✅ | ✅ | ⚠️ Button exists, no action |
| Save analysis | ✅ | ✅ | ❌ Not built |
| Share analysis link | ❌ | ✅ | ❌ Not built |
| ImmoScore on results | N/A | N/A | ❌ Score not shown on results |

### Current State
- Core metrics are calculated and displayed (cashflow, cap rate, CoC, GRM)
- Monthly breakdown is detailed and clear
- "Exportar" button exists but **does nothing**
- 5yr/10yr appreciation numbers exist but no visual chart
- `monthlyServices` and `monthlySuggestion` are editable on results page — good, but confusing UX since they don't affect the cashflow shown in the main metrics
- No ImmoScore on results page (should show what this property would score)
- No way to save or share the analysis

### Most Important Gaps for Launch
1. Export to PDF — investors need to share analyses with partners/banks
2. Add a cashflow-over-time chart (even a simple bar chart for 10 years)
3. Show a computed ImmoScore on the results page
4. Fix the disconnect between editable "Custo mensal estimado" and the main cashflow calculation

### Checklist

**Blockers**
- [ ] 🔴 Wire "Exportar" button to generate a PDF (use `window.print()` with a print stylesheet for v1, upgrade to proper PDF later)
- [ ] 🔴 Fix the disconnect: `monthlyServices` and `monthlySuggestion` in the results page are editable but don't update `results.monthlyCashFlow` — either make them affect the calculation or remove the editable fields from results (they belong in the form)
- [ ] 🔴 Add ImmoScore to results: compute it from the results object and display it with `getScoreLabel()`

**Core functionality**
- [ ] Add 10-year cashflow chart (bar chart using Recharts or Chart.js — already in scope for Next.js)
- [ ] Add appreciation projection chart (line chart: value over 10 years)
- [ ] Add "Salvar análise" button — save to localStorage for v1 with a name/title
- [ ] Add a recommendation summary at the top: "Este imóvel tem ImmoScore 82 (Bom). O fluxo de caixa é positivo e o cap rate supera a média de SP."

**Polish**
- [ ] Add "Refazer análise" quick-edit panel on the side (change key assumptions without going back to form)
- [ ] Add metric tooltips explaining cap rate, GRM, CoC return for non-expert investors
- [ ] Better visual hierarchy: ImmoScore pill + recommendation first, then details below
- [ ] Show comparison to market average (e.g. "Cap rate 7.2% vs média SP de 5.8%")
- [ ] Add "Compartilhar" — generate a URL with compressed params (for v1)

### Deploy Criteria
- Export button generates a printable PDF (even via `window.print()`)
- Cashflow chart renders with 10-year projection
- ImmoScore is shown and computed from the analysis
- Editable fields on results page either affect the calculation or are removed

---

## Priority Order for First Deploy

The critical path to launch — do these in order:

### Phase 1 — Fix the Broken (1–2 days)
Fix all 🔴 items across all sections. Nothing should throw a runtime error. Every page must render.

1. Implement `getScoreLabel()` (used in 3 places)
2. Fix `OpportunityCard` JSX
3. Fix opportunities page h1 and Select components
4. Fix condoFee query param and disabled field on form
5. Remove duplicate card section on form
6. Fix not-found state on detail page

### Phase 2 — Real Data (2–3 days)
Connect Supabase and seed real data.

1. Create `opportunities` table in Supabase
2. Seed with 15–20 real/realistic Brazilian properties
3. Replace mock data in both opportunities pages
4. Add loading states

### Phase 3 — Analysis Completeness (2–3 days)
Make the analysis experience complete and trustworthy.

1. Wire "Exportar" PDF button
2. Add cashflow chart on results
3. Add ImmoScore to results page
4. Generate rule-based "Por que é interessante" and "Riscos" on detail page
5. Auto-save form to localStorage

### Phase 4 — Link Feature Polish (1–2 days)
Make the link extraction delightful and reliable.

1. End-to-end test with real VivaReal URLs
2. Add confidence indicators on extracted fields
3. Improve loading UX during extraction

### Phase 5 — Launch Polish (1 day)
Last 10% before going live.

1. SEO metadata on all pages
2. Mobile responsiveness pass
3. Empty states and error boundaries
4. Add "Novo" badges, price/m², bedrooms filter to opportunities page

---

## Key Metrics to Hit Before Launch

| Metric | Target |
|---|---|
| Properties in database | ≥ 15 seeded |
| Pages with runtime errors | 0 |
| Link extraction success rate (VivaReal) | ≥ 70% |
| Time to first analysis from homepage | < 60 seconds |
| Mobile usability (375px) | All pages fully usable |
| PDF export works | Yes |
| Form auto-saves | Yes |

---

## What Makes ImmoYield Different (the story)

Competitors like VivaReal and ZAP are listing portals — they show you properties but don't tell you if they're good investments. Mashvisor and Roofstock exist only for the US market.

ImmoYield's v1 differentiators:
1. **ImmoScore** — one number that ranks rental investment quality (no competitor in Brazil does this)
2. **Link extraction** — paste any listing URL, get an instant investment analysis (unique in Brazil)
3. **Opinionated** — we tell you if it's a good deal with plain-language reasons, not just raw numbers
4. **Speed** — analysis in under 60 seconds vs hours of spreadsheet work

These should be the headline of the homepage and the frame for every product decision.
