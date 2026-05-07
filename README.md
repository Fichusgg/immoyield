# ImmoYield

Brazilian real estate investment calculator. Analyze deals, compare against CDI/FII benchmarks, generate PDF reports, and share analyses via public links.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + Turbopack
- **Styling**: Tailwind CSS v4 + shadcn/ui (base-nova)
- **State**: Zustand
- **Forms**: react-hook-form + Zod
- **Backend**: Supabase (Auth + PostgreSQL)
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── analisar/           # Deal analysis wizard
│   ├── api/
│   │   ├── cron/           # Weekly CDI benchmark update (Vercel Cron)
│   │   ├── deals/          # Deal calculation endpoint
│   │   └── shares/         # Public share link management
│   ├── auth/               # Supabase Auth UI
│   ├── imoveis/[id]/       # Deal detail view
│   ├── meus-negocios/      # Saved deals dashboard
│   └── r/[slug]/           # Public shared report view (no auth)
├── components/
│   ├── dashboard/          # DealList, DealCard
│   ├── deals/              # DealWizard, ResultsScreen, tab steps
│   ├── layout/             # SidebarLayout, AppLayout
│   ├── pdf/                # PDF report generation
│   ├── share/              # Share button & public report view
│   └── ui/                 # Button, Input, CurrencyInput primitives
├── lib/
│   ├── calculations/       # Financing (PRICE/SAC), rental & projection math
│   ├── supabase/           # Supabase client (browser + server + middleware)
│   └── validations/        # Zod schemas & property type constants
└── store/
    └── useDealStore.ts     # Zustand store for deal wizard form state
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your values — see `.env.example` for descriptions.

| Variable                        | Required   | Description                                               |
| ------------------------------- | ---------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes        | Your Supabase project URL                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes        | Supabase anonymous (public) key                           |
| `NEXT_PUBLIC_SITE_URL`          | Yes        | Site URL for auth redirects (e.g., https://yourdomain.com) |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes (cron) | Service role key — used by the CDI cron job to bypass RLS |
| `CRON_SECRET`                   | Yes (cron) | Secret for authenticating `/api/cron/*` requests          |
| `STRIPE_SECRET_KEY`             | Yes (paywall) | Stripe API key (`sk_test_*` in dev, `sk_live_*` in prod) |
| `STRIPE_PREMIUM_PRICE_ID`       | Yes (paywall) | Recurring price id for the Premium plan (`price_*`)   |
| `STRIPE_WEBHOOK_SECRET`         | Yes (paywall) | Webhook signing secret (`whsec_*`)                    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (paywall) | Publishable key (`pk_test_*` / `pk_live_*`)      |

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script                 | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start dev server with Turbopack  |
| `npm run build`        | Production build                 |
| `npm run start`        | Start production server          |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |
| `npm test`             | Run unit tests (Vitest)          |

## Auth

Authentication is handled by Supabase Auth UI. Users sign in at `/auth`. The middleware (`src/middleware.ts`) protects all routes except `/`, `/auth`, `/auth/callback`, and `/r/*` (public share links).

## Cron Jobs

The CDI benchmark is updated weekly via Vercel Cron (`vercel.json`). The cron hits `/api/cron/update-benchmarks` with a `Bearer <CRON_SECRET>` header and pulls the latest CDI daily rate from BACEN SGS API, then annualizes it using the 252 business-day convention.

## Billing & Paywall

Two tiers, gated centrally in [`src/lib/entitlements.ts`](src/lib/entitlements.ts):

- **Free** — up to 3 lifetime deal analyses, no rent comparator.
- **Premium** — unlimited deals, rent comparator, future Premium features.

The DB (`public.users`) is the source of truth. Subscription state is written **only** by the Stripe webhook (service-role key); a Postgres trigger blocks end users from self-promoting via the existing "update own row" RLS policy. A second trigger on `public.deals` enforces the 3-deal lifetime cap regardless of which client path inserts.

### Stripe setup

1. Create one product + one recurring price in [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products). Copy the price id into `STRIPE_PREMIUM_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from Dashboard → Developers → API keys.
3. Forward webhooks locally:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   The CLI prints `whsec_...` — paste it into `STRIPE_WEBHOOK_SECRET`.
4. In production, create a webhook endpoint at `https://<your-domain>/api/stripe/webhook` subscribed to:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`. Copy the live signing secret into the env var.

### Manual test checklist

- Sign in, visit `/precos`, click **Fazer upgrade** → redirected to Stripe Checkout.
- Pay with `4242 4242 4242 4242`, any future CVC/expiry, any ZIP. Auth-required test card is `4000 0025 0000 3155`.
- Watch the `stripe listen` output — you should see `checkout.session.completed` then `customer.subscription.created`. The `users.plan` column flips to `premium`, `subscription_status` to `active`.
- `/precos` now shows **Gerenciar assinatura** instead of upgrade. Click it to land in the Stripe Billing Portal.
- Cancel from the portal → `customer.subscription.deleted` fires → `plan` returns to `free`.
- As a free user, save 3 deals → the 4th INSERT raises `free_tier_deal_limit_reached`. The dashboard banner at `/propriedades` flips to "atingiu o limite".
- As a free user, GET `/imoveis/<id>/comps-aluguel` → page renders the locked card; POST `/api/rent-compare` returns 402.

### Webhook idempotency

Each event id is inserted into `public.stripe_processed_events` before the handler runs. Stripe retries the same event id, so duplicate deliveries return 200 without re-processing. If the handler throws, the dedup row is rolled back so Stripe's retry will re-attempt.
