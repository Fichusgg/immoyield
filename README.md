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
