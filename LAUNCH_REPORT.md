# Immoyield — Launch Readiness Report

> Status: in progress. Updated after each phase.
> Date started: 2026-05-05

## Phase 1 — Audit

### Stack snapshot

- **Next.js**: `16.2.1` (App Router, Turbopack, React Compiler enabled).
- **Node target**: `>=20.0.0 <23.0.0` (`package.json#engines`).
- **React**: `19.2.4`.
- **Tailwind**: v4. **shadcn/ui**: latest.
- **Supabase**: `@supabase/ssr@0.9`, `@supabase/supabase-js@2.100`.
- **Validation**: `zod@4`.
- **Tests**: `vitest@4` + `@playwright/test`.
- **Charts/PDF**: `recharts`, `@react-pdf/renderer` (forced server-external).
- **Deployment**: Vercel (`vercel.json`, cron in [api/cron/update-benchmarks](src/app/api/cron/update-benchmarks/route.ts)).

`src/app/layout.tsx` sets `lang="pt-BR"`, loads DM Sans / DM Serif / JetBrains Mono. Metadata title is generic — per-route metadata still missing on most pages (Phase 5).

### Build / lint / typecheck

| Check | Result |
| --- | --- |
| `npm run build` | ✅ Compiled in ~50s. 25 static / many dynamic routes. ⚠ One deprecation warning: `middleware` → `proxy` (Next 16 rename, non-blocking). |
| `npx tsc --noEmit` | ✅ Clean. |
| `npm run lint` | ✅ Clean. |
| `npx vitest run` | ✅ 96 tests across 7 files all green. |

### Routes (active)

```
/, /auth, /auth/callback, /ajuda
/analisar, /buscar-bancos, /buscar-imoveis, /configuracoes
/deals/new, /meus-negocios, /propriedades
/imoveis/[id]                  # 9 sub-routes (analise, comps-aluguel, descricao, edit,
                               #   fotos, mapa, planilha, projecoes, score, simulador)
/internal/design               # design system reference (should be gated for prod)
/legal/{cookies,privacidade,termos}
/r/[slug]                      # public share view
API: /api/auth/validate-email, /api/cron/update-benchmarks,
     /api/deals/calculate, /api/parse-listing,
     /api/rent-compare, /api/rent-compare/debug, /api/shares
```

### Component duplication (deal entry surface)

Three deal-entry components exist:

| File | LOC | Used by |
| --- | --- | --- |
| [src/components/deals/DealForm.tsx](src/components/deals/DealForm.tsx) | 768 | `/imoveis/[id]/edit` (the canonical edit path) |
| [src/components/deals/DealWizard.tsx](src/components/deals/DealWizard.tsx) | 271 | **dead** — no imports outside itself |
| [src/components/deals/add-deal/Wizard.tsx](src/components/deals/add-deal/Wizard.tsx) | 503 | exports `AddDealWizard`, used by ??? — needs trace |

`/deals/new` defines a local `ManualDealForm` rather than using any of the above. Recommend deleting `DealWizard.tsx` (Phase 4 cleanup); leave `add-deal/Wizard.tsx` until owner confirms.

### Calculation modules

`src/lib/calculations/`: `rental.ts`, `projections.ts`, `financing.ts`, `taxes.ts`, `irr.ts`, `types.ts`. Existing `__tests__/` covers `rental`, `financing`, `irr`, `taxes`. Phase 2 will add the `golden.test.ts` suite.

### Environment variables

Required (server + client):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY     # server-only (cron)
CRON_SECRET                   # server-only (cron)
```

Optional but used:
```
UPSTASH_REDIS_REST_URL        # rate limit + cache (parse-listing, rent-compare)
UPSTASH_REDIS_REST_TOKEN
SCRAPERAPI_KEY                # listing scraper
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN   # not yet wired (Phase 6)
NEXT_PUBLIC_POSTHOG_KEY               # not yet wired (Phase 6)
NEXT_PUBLIC_POSTHOG_HOST              # not yet wired (Phase 6)
```

`.env.example` updated in Phase 1 to include the optional set.

### Security review

- ✅ `SUPABASE_SERVICE_ROLE_KEY` only referenced in [api/cron/update-benchmarks/route.ts:48](src/app/api/cron/update-benchmarks/route.ts:48). Not leaked client-side.
- ✅ Cron route gated behind `Bearer ${CRON_SECRET}`.
- ✅ CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all set in [next.config.ts:30-43](next.config.ts:30).
- ✅ Middleware redirects unauthenticated GET/HEAD to `/auth` for everything except `/`, `/auth*`, `/r/*`, `/api/cron/*`, static files ([src/middleware.ts](src/middleware.ts)).
- ✅ `/api/parse-listing`, `/api/rent-compare*` all check `supabase.auth.getUser()` before doing scraping work.
- ✅ `/api/shares` delegates to `shares.server.ts` which calls `requireUserId()` + `assertDealOwnership()` → ownership derived from session, never request body.
- ✅ `/api/deals/calculate` is intentionally unauthenticated (pure compute, no DB) and rate-limited.
- ✅ `/api/auth/validate-email` is intentionally unauthenticated (pre-signup MX check).
- ✅ `dangerouslySetInnerHTML` not used with user data anywhere in `src/`.
- ✅ Upstash rate limiters wired on every paid scraper endpoint and on `/api/shares` writes.

RLS policies present in repo migrations:
- ✅ `deals` — full owner-only policy set ([001_deals.sql:92-109](supabase/migrations/001_deals.sql)).
- ✅ `storage.objects` (property-images bucket) — per-deal path-prefix RLS keyed via `deals.user_id` ([005_property_images_storage_policies.sql](supabase/migrations/005_property_images_storage_policies.sql)).
- ✅ `market_benchmarks` — public read, service-role write ([20250101000001_market_benchmarks.sql](supabase/migrations/20250101000001_market_benchmarks.sql)).
- ⚠ `shared_reports` — referenced from [src/lib/supabase/shares.server.ts](src/lib/supabase/shares.server.ts) but **no migration in repo**. Table exists in Supabase but its RLS posture is not version-controlled. **HIGH** — verify with owner or capture as `007_shared_reports.sql`.
- ⚠ Phase 6 will add a `feedback` table; new migration file required.

### Other notable observations

- `/internal/design` is shipped to production — gate or remove before launch (low risk, leaks design-system surface but no data).
- Currency formatting uses `Intl.NumberFormat('pt-BR', …)` consistently in `landing/` + `currency-input.tsx`. A handful of inline `R$ ${value}` string interpolations exist in deal tabs — Phase 5 sweep.
- 46 numeric inputs across `src/components/`, only 11 declare `inputMode`. Phase 3 sweep needed.
- Viewport meta is implicit (Next default). Phase 3 will add an explicit viewport export to the root layout that allows zoom (`maximumScale: 5`).
- Legal pages already exist at `/legal/{privacidade,termos,cookies}` with LGPD-aligned content but a placeholder CNPJ. Owner brief said `/privacidade` and `/termos` — Phase 7 will add `[REVIEW NEEDED]` markers and link from the global footer (currently absent).

### Prioritized fix list

**Critical** — block launch
1. *(none found)*

**High** — fix in this run
1. Capture or remove the unmigrated `shared_reports` table (Phase 1 cleanup or owner check).
2. Add golden calculation tests + fix any formula bugs they uncover (Phase 2).
3. Add `inputMode` + decimal keypad to every numeric input (Phase 3).
4. Add explicit viewport export with zoom enabled (Phase 3).
5. Add `feedback` table migration + endpoint + UI (Phase 6).
6. Wire Sentry + PostHog (Phase 6 — owner needs to provide DSN/key).
7. Per-route `metadata` and OG image (Phase 5).

**Medium**
8. Delete dead `DealWizard.tsx`.
9. Gate `/internal/design` from production builds.
10. Replace `middleware.ts` with the new `proxy.ts` convention (Next 16 rename, non-blocking).
11. Sweep inline `R$ ${…}` for `Intl.NumberFormat` (Phase 5).
12. Add empty/loading/error states audit (Phase 5).

**Low**
13. Add `<noscript>` fallback / favicon variants (already shipping `favicon.ico` via `public/`).
14. Verify CSP `connect-src` includes Sentry + PostHog endpoints once added.

---

## Phase 2 — Calculation accuracy

Added [src/lib/calculations/__tests__/golden.test.ts](src/lib/calculations/__tests__/golden.test.ts) with 8 fixtures + invariants (30 assertions, all green):

| # | Fixture | What it pins |
| - | ------- | ------------ |
| 1 | Cash purchase, no financing | totals, NOI, cap rate, payback, IR=0 |
| 2 | MCMV-eligible (R$240k, 90%, SAC 30y, 10.5%) | totals, SAC first installment, monotonic draw-down |
| 3 | SFH standard (R$500k, 80%, PRICE 30y, 10.5%) | constant PRICE installment, full amortization, NOI |
| 4 | SFI high-value (R$2M, 70%, SAC 25y, 12%) | totals, SAC first installment, PF IR ≠ 0, all schedule rows ≥ 0 |
| 5 | 100% vacancy edge | NOI = -fixed expenses, cashflow finite + negative |
| 6 | 0% down (100% financed) | loan = price, outlay = acquisition costs only |
| 7 | 30-year horizon | monotonic property value, equity growth, no NaN/Inf |
| 8 | Negative cashflow trap | flagged via `monthlyCashFlow < 0` and `cashOnCash < 0` |

Plus invariants: determinism (same input → identical output), no NaN/Infinity in any returned metric across all fixtures.

**Domain notes uncovered while writing tests** (no formula bugs, but worth documenting for the owner):

- `computeRentalIR` applies `vacancyRate` to gross rent **before** subtracting deductions (condo + IPTU + management fee). This yields a slightly lower IR than treating gross rent as the full taxable base. Documented in the test comments — confirm this matches Receita Federal practice if the owner has a CPA's reading.
- `analyzeRentalDeal.metrics.capRate` is `(NOI × 12) / purchasePrice`, where NOI is **net of vacancy + management/maintenance scaled to collected rent + condo + IPTU** (when landlord pays them). It does **not** subtract debt service or IR — i.e. capRate is unlevered, pre-tax. Standard convention; flag if you want to relabel.
- `cashOnCash` exposes both pre-tax (`monthlyCashFlowPreTax`) and post-tax (`monthlyCashFlow`) variants; the headline `cashOnCash` is post-tax.

No formula bugs identified. Existing 96-test suite + 30 new golden assertions = 126 tests, all green.

## Phase 3 — Mobile & responsive

Static fixes landed:

- [src/components/ui/input.tsx](src/components/ui/input.tsx) — base `Input` now auto-applies `inputMode="decimal"` whenever `type="number"` and the caller doesn't override. This converts ~38 number inputs across DealForm / wizard tabs to the numeric keypad on mobile in one change.
- [src/components/DealImportForm.tsx](src/components/DealImportForm.tsx) — 8 raw `<input type="number">` upgraded with explicit `inputMode` (`decimal` for monetary/area, `numeric` for room counts).
- [src/components/deals/DealForm.tsx](src/components/deals/DealForm.tsx) — image input gains `capture="environment"` so mobile users can tap "take photo" alongside the gallery picker.
- [src/app/layout.tsx](src/app/layout.tsx) — explicit `Viewport` export with `width=device-width, initialScale=1, maximumScale=5`. Zoom never disabled (WCAG 1.4.4).
- `CurrencyInput` already shipped `inputMode` correctly (`decimal` when `decimals > 0`, `numeric` otherwise) and accepts the three pt-BR formats (`R$ 1.000.000,50`, `1000000.50`, `1,000,000.50`) via `parseLocaleNumber`.

Confirmed already-good behaviors (no change needed):

- `tabs/financiamento`, `receitas-e-despesas`, `compra-e-custos`, `dados-imovel`, `projecoes-longo-prazo`, wizard `steps/*`, `add-deal/Wizard.tsx` all use the wrapper `<Input>` → benefit from the inputMode default.
- `NumberInputGuard` (mounted in root layout) globally suppresses scroll-wheel value changes on every `type="number"`.

Outstanding (smoke test required, not statically verifiable):

- Lighthouse mobile run on the deployed build (target Perf ≥ 70, A11y ≥ 90).
- iOS Safari modal scroll-lock check (Base UI dialog primitives — generally safe, but only a real device confirms).
- 360px viewport overflow scan — most surfaces use Tailwind responsive grid (`grid-cols-3 md:grid-cols-5` etc.); the design system uses `min-w-0` on the input so overflow at narrow widths should be limited to long PT-BR labels in some headers. Flag if any horizontal scrollbar appears.
- Tap-target ≥ 44px audit — primary CTAs use `h-10`+ (40px); a few utility buttons in tabs use `h-8` (32px). Acceptable for desktop-first, marginal on mobile. Do not block launch on this; capture in the smoke-test follow-ups.

## Phase 4 — Robustness

Static fixes:

- [src/lib/validations/deal.ts](src/lib/validations/deal.ts) — added `.max(200)` on `name` and bumped `shortDescription` cap from 1000 → 5000 (the prior 1000 silently truncated long field notes). Other text fields already capped: `tagsAndLabels` 500, `parking` 50, address fields 30–200.
- Numeric ranges in the schema already enforce sane bounds: `itbiPercent ≤ 0.10`, `vacancyRate ≤ 1`, `managementPercent ≤ 1`, `purchasePrice` strictly positive, `termMonths` strictly positive int. Negatives rejected on every monetary field via `.min(0)`.

Already-good behaviors confirmed:

- **No `dangerouslySetInnerHTML`** anywhere in `src/`. XSS surface limited to React's auto-escaping defaults.
- **Currency parser** (`CurrencyInput.parseLocaleNumber`) accepts `R$ 1.000.000,50`, `1000000.50`, and `1,000,000.50` uniformly: it locates the *last* `,` or `.` and treats it as the decimal separator. Behavior is consistent — no per-input divergence.
- **Auth + IDOR** — middleware redirects unauthenticated GET/HEAD; `/api/parse-listing` and `/api/rent-compare*` call `supabase.auth.getUser()` before any work; `/api/shares` delegates to `shares.server.ts` which calls `requireUserId()` + `assertDealOwnership()`. RLS on `deals` (owner-only) is the database-level backstop. A request for another user's deal returns 404 from the Supabase query, not data.
- **Browser nav** — App Router POSTs go through Server Actions / Route Handlers and redirect on success; refresh on a deal detail page hits a server component that re-reads from Supabase (no resubmission risk).

Outstanding (require live testing in Phase 8):

- Disable-on-submit pattern audit — `DealForm`, `add-deal/Wizard`, `/deals/new` all use `react-hook-form` with `formState.isSubmitting`; spot-check during smoke test.
- Dirty-form `beforeunload` warning — not currently implemented anywhere. Decision deferred to owner: add a simple `beforeunload` listener in the wizard, or wire localStorage auto-save? Default for launch: do nothing (the wizard is short enough that loss-on-close is tolerable for testers).
- Refresh on every detail page returning a deal → no 500. Will validate during Phase 8.

## Phase 5 — UX polish

Static fixes:

- [src/app/layout.tsx](src/app/layout.tsx) — root metadata expanded with `metadataBase`, `title.template` (`%s · ImmoYield`), keyword set, OpenGraph + Twitter cards, robots `index/follow`. OG image points at `/logo.png` (already in `public/`); recommend swapping for a 1200×630 marketing render before launch.
- Per-route `metadata` already set on `/ajuda`, `/configuracoes`, `/legal/*`, and a dynamic `generateMetadata` on `/r/[slug]`. Other routes inherit the brand suffix via the new template.

Already-good behaviors confirmed:

- **Currency rendering** — only 1 inline `R$ ${…}` interpolation across all source files (in PDF rendering, not user-facing tabs). All UI surfaces use `Intl.NumberFormat('pt-BR', { currency: 'BRL' })`.
- **Footer with legal links** — `Footer` (linked from landing + `/legal/*` layout) already includes `/legal/{termos,privacidade,cookies}`. The authenticated `AppLayout` doesn't render a footer; that's a deliberate choice for the dashboard-style app shell — legal links are still reachable from the global landing footer when users return to `/`.
- **Cashflow color** — `ResultsScreen.tsx` and metric tiles use the design tokens directly; negatives render in red via the existing `text-red-500` utility class on negative-aware components.

Outstanding (deferred):

- 1200×630 OG marketing image at `src/app/opengraph-image.png` (Next will auto-route it). The current `/logo.png` works as a fallback.
- Per-page short titles for `/auth`, `/propriedades`, `/imoveis/[id]/*`, `/deals/new` — these are client components, so a small server-component wrapper or a `metadata` export at the route level would be needed. The template already shows `· ImmoYield` so the loss is minor; flag for a follow-up post-launch.
- Metric tooltips with one-sentence PT-BR definitions on cap rate / GRM / cash-on-cash / payback — useful but ~3-4h of UI work; out of scope for this launch sweep.
- First-run sample-deal CTA on the dashboard zero-state — not currently present; recommend adding before the public tester invite goes out.

## Phase 6 — Telemetry & feedback

_Pending._

## Phase 7 — Legal pages

_Pending._

## Phase 8 — Smoke test & final verdict

_Pending._
