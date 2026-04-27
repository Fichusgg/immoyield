# DealCheck-style Property Workspace — Refactor Notes

## Summary
Restructured the authenticated property experience into a DealCheck-style workspace with a sticky property sidebar, deep-linkable sub-routes, and shared form primitives. **Zero changes to design tokens, colors, fonts, or the calculation engine.** All copy is pt-BR and currency is BRL.

---

## What's new

### Routes
| Path | Status |
|---|---|
| `/imoveis/[id]` | **Now redirects to `/imoveis/[id]/analise`** |
| `/imoveis/[id]/analise` | **NEW** — KPI grid · Compra & Reforma + donut · Financiamento · Fluxo de Caixa (mensal/anual) · 30y chart · Retornos |
| `/imoveis/[id]/descricao` | **NEW** — Nome, Endereço, Características (12 fields), Notas |
| `/imoveis/[id]/planilha` | **NEW** — Full purchase worksheet (Preço, Financiamento, Custos, Reforma, Receita, Despesas link, Projeções) |
| `/imoveis/[id]/planilha/despesas` | **NEW** — Itemized operating expenses with unit selector (Por Mês / Por Ano / % do Aluguel) |
| `/imoveis/[id]/fotos` | **NEW** — Real upload to `property-images` Supabase Storage bucket · drag-drop or click-to-pick · cover indicator on the first photo · hover overlay (zoom / set as cover / delete) · lightbox · client-side validation (type whitelist + 10 MB cap) |
| `/imoveis/[id]/mapa` | **NEW** — *Em Breve* (Como Chegar deeplink works when address is set) |
| `/imoveis/[id]/projecoes` | **NEW** — Live scenario controls (período, valorização, custos de venda) · 4 KPIs · valor + equity area chart · 9-row year-by-year table (1, 2, 3, 5, 10, 15, 20, 25, 30 anos) |
| `/imoveis/[id]/comps-vendas` | **NEW** — Add/edit/delete sales comps · stats KPIs (mediana / média / faixa por m²) · ARV-suggestion panel with one-click "Aplicar como ARV" · persists to `deals.comps.sales` |
| `/imoveis/[id]/comps-aluguel` | **NEW** — Same UX as comps-vendas but for monthly rent · "Aplicar como Aluguel" pushes median to `inputs.revenue.monthlyRent` |
| `/imoveis/[id]/edit` | **Kept untouched** — legacy edit form via `DealForm` (still works as a fallback) |
| `/buscar-imoveis` | **NEW** — *Em Breve* landing |
| `/buscar-bancos` | **NEW** — *Em Breve* landing |

### Shared primitives (`src/components/property/`)
All wrap existing `src/components/ui/*` (shadcn / base-ui) — no parallel components.

| File | Purpose |
|---|---|
| `format.ts` | pt-BR / BRL formatters (`brl`, `pct`, `num`, `area`, `ymd`) |
| `PageHeader.tsx` | Title + breadcrumb + helper + actions |
| `SectionHeading.tsx` | Uppercase label outside cards + optional right slot |
| `FormCard.tsx` | White card with thin row dividers |
| `FormRow.tsx` | 30% / 70% label-input split + `?` tooltip |
| `NumberInput.tsx` | Numeric input with left/right unit tabs (R$, %, m², Anos) — pt-BR comma decimals |
| `UnitSelect.tsx` | Right-attached "Por Mês / Por Ano / …" select; exports `PERIOD_OPTIONS`, `RENT_PERCENT_OPTIONS` |
| `Toggle.tsx` | Sage-green pill switch (`role="switch"`, `aria-checked`) with optional label/description row |
| `KpiCard.tsx` | Uppercase label + large mono value + optional benchmark bar + tone (positive/negative/neutral) |
| `DonutChart.tsx` | Recharts pie with tabbed datasets, centered total label, full legend |
| `FloatingHelpButton.tsx` | Fixed bottom-right help bubble with unread badge |
| `ComingSoonPanel.tsx` | Standard *Em Breve* placeholder; supports preview content behind overlay |
| `PlaceholderPage.tsx` | PageHeader + ComingSoonPanel composition for placeholder routes |
| `PropertySidebar.tsx` | Sticky 270px property card — hero image + status badges + share + title + address + specs + price/cap + grouped nav + Excluir |
| `PropertyWorkspace.tsx` | Two-column layout shell (sidebar + outlet + floating help) |
| `sidebar-nav.ts` | Single source of truth for the property nav order, groups, and Em Breve flags |
| `loadDeal.ts` | Server-side auth + ownership-checked deal fetch — used by every workspace page |
| `save-deal.ts` | Client-side `patchDeal` helper for form persistence |
| `comps/helpers.ts` | Shared comp math (price/m², median, mean, suggestedFromComps) + sales↔rentals normalization |
| `comps/AddCompDialog.tsx` | Modal for adding/editing a single comp (sales or rentals mode) |
| `comps/ComparablesContent.tsx` | Shared content for both `/comps-vendas` and `/comps-aluguel` (mode prop) — KPIs, suggestion panel, table, save bar, auto-import badge |

### Storage helpers (`src/lib/supabase/storage-photos.ts`)
| Export | Purpose |
|---|---|
| `uploadPropertyPhoto(dealId, file)` | Validates type/size, uploads to `property-images/{dealId}/{uuid}.{ext}`, returns public URL |
| `deletePropertyPhoto(url)` | Best-effort delete; silently skips foreign URLs (e.g. scraped listing photos) |
| `isOwnedPhoto(url)` | True for our-bucket URLs, false for imported third-party URLs |
| `MAX_PHOTO_BYTES`, `ACCEPTED_PHOTO_TYPES` | Validation constants |

### Storage policies (`supabase/migrations/005_property_images_storage_policies.sql`)
RLS policies on `storage.objects` for the `property-images` bucket — INSERT / UPDATE / DELETE all scoped to the requesting user owning the deal whose ID is the first path segment. Reads stay public via the bucket's PUBLIC flag (set in dashboard). **Apply this migration after creating the bucket.**

### Top nav (`src/components/layout/TopNav.tsx`)
- Three primary links: **Meus Imóveis** · **Buscar Imóveis** *Em Breve* · **Buscar Bancos** *Em Breve*
- Active link gets sage underline indicator
- Right cluster: Upgrade · Notificações · Ajuda · Configurações icon buttons + user avatar + Sair
- Property workspace (`/imoveis/*`) and `/meus-negocios` both light up "Meus Imóveis"

### Sidebar nav structure
```
Descrição
Planilha de Compra
Fotos
Mapa · Em Breve
─────  ANÁLISE  ─────
Análise
Projeções
─────  PESQUISA  ─────
Comparáveis de Venda
Comparáveis de Aluguel
─── (footer)
Excluir
```

---

## What's reused

- **Design tokens** — zero changes. All new components use existing tokens from `src/styles/tokens.css` and `globals.css`.
- **`src/components/ui/*`** (shadcn / base-ui Button, Card, Input, Select, Tooltip, etc.) — wrapped, never duplicated.
- **`src/lib/calculations/*`** — `analyzeRentalDeal`, `calculateProjections`, `calculateIRR`, `BR_BENCHMARKS`. The Análise page reads `deal.results_cache.metrics` produced by the wizard. **No calculation logic changed.**
- **`src/lib/validations/deal.ts`** — `DealInput` / `DealInputs` shape is the canonical model bound by both the wizard and the new Planilha de Compra. **No schema changes.**
- **`src/lib/supabase/deals.ts`** — `SavedDeal`, `getDeals`, `deleteDeal`, `saveDeal` reused as-is. Added a thin `patchDeal` client helper for the new edit flows.
- **`src/components/share/ShareButton.tsx`** — embedded in the property sidebar with `compact`.
- **`src/lib/benchmarks.ts`** — available for future benchmark-bar wiring on KPI cards.
- **Wizard at `/deals/new`** — kept as the **create** entry point. The Planilha de Compra is the **edit** surface bound to the same `DealInput` shape; both flows share the schema.

---

## What's deleted

- `src/components/layout/SidebarLayout.tsx` — unused alternative shell
- `src/components/deals/DealDetailView.tsx` — replaced by the `/imoveis/[id]/<section>` sub-routes; the local `Section`/`Row`/`RowCalc` helpers are now `FormCard`/`FormRow` primitives

`/imoveis/[id]/edit/` is **NOT** deleted — kept intentionally as a fallback edit path via `DealForm`.

---

## TODOs / queued for follow-ups

- **Maps integration:** Mapbox or Google Maps key needed. The Mapa page already provides a working "Como Chegar" deeplink to Google Maps when an address is set.
- **Custom expense rows:** the `expenses` schema has 4 fixed bound fields (`condo`, `iptu`, `managementPercent`, `maintenancePercent`). The Despesas sub-page renders them as a list with unit selector but the Add/Delete row UI is gated until the schema is extended with a JSON `customItems` array.
- **Comparáveis · auto-import:** manual entry works end-to-end and persists. The "Importação Automática · Em Breve" badge marks the spot for wiring `src/lib/scrapers/` (vivareal/zap/quintoandar) to fetch proximity/specs-matched listings — likely needs a server action with rate limiting.
- **Top-bar dropdowns:** Ajuda and Configurações icon buttons render but don't open menus yet — add Popover content when settings/help routes exist.
- **Floating help bubble:** wire `onClick` to Crisp / Intercom / etc. when a support channel is chosen.
- **Mobile sidebar:** the property sidebar is 270px sticky on desktop. Below 768px it stacks above content; consider a collapsible drawer (the `Sheet` ui primitive is already available).
- **Recalculate on Planilha save:** the worksheet currently only persists `inputs`. Re-running `analyzeRentalDeal()` and updating `results_cache` after save would surface fresh KPIs immediately on the Análise page (currently shows last wizard-cached values until the user re-runs the wizard).

---

## Verification

- `tsc --noEmit` — **clean** ✓
- `eslint src/components/property src/app/imoveis src/app/buscar-imoveis src/app/buscar-bancos src/components/layout/TopNav.tsx` — **0 errors, 0 warnings** ✓
- All marketing/auth/share routes (`/`, `/auth`, `/r/[slug]`) untouched ✓
- Existing wizard `/deals/new` and edit `/imoveis/[id]/edit` untouched ✓
