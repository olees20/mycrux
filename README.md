# Crux climbing gym platform

A production-oriented, multi-tenant climbing gym platform with authentication, tenant-isolated member and staff journeys, route and wall management, events, community, chat, competitions, waivers, privacy controls, platform administration, and Stripe SaaS billing. External gym-management adapters remain disabled until a provider contract is selected and implemented.

## Requirements

- Node.js 20.9 or newer
- npm
- A development Supabase project
- Stripe test-mode credentials for gym SaaS billing

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in development/test values. Never commit secrets.
3. Run `npm run dev` and open `http://localhost:3000`.

The environment helpers produce a single, readable error listing invalid or missing variables. Public variables are isolated in `src/env/client.ts`; privileged variables are available only through the `server-only` module in `src/env/server.ts`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Check strict TypeScript |
| `npm test` | Run Vitest once |
| `npm run test:db` | Apply migrations and run the tenant/RLS SQL suite against a disposable PostgreSQL database |
| `npm run test:e2e` | Run Playwright browser checks |
| `npm run build` | Create a production build |
| `npm start` | Serve a production build |
| `npm run db:types -- URL` | Regenerate typed Supabase schema from a migrated development database |

## Structure

- `src/app/(public)` — marketing pages
- `src/app/(auth)` — authentication entry points
- `src/app/(protected)` — authenticated, role-aware member, staff, and platform journeys
- `src/components/ui` — accessible, reusable UI primitives
- `src/features` — business capabilities grouped by feature
- `src/lib/server` — server-only utilities
- `src/lib/supabase` — typed browser, server, privileged, and business-data clients
- `src/validation` — shared external-input schemas
- `src/tests` — test setup and cross-cutting test helpers

## Supabase

Create a separate Supabase project for development/staging. Put its URL and anonymous key in `.env.local`; the anonymous key is public and all future data access must still be protected by Row Level Security. Keep the service-role key server-side. Apply every schema change through versioned migrations—never make undocumented production-only dashboard changes.

## Stripe

Use Stripe test mode locally and separate webhook secrets per environment. Stripe in this product bills gyms for access to the platform only. Member memberships and day-pass payments are a separate, deferred integration.

## Vercel

Import the repository into Vercel, select the Next.js framework preset, and configure all variables from `.env.example` for Preview and Production separately. Use a staging Supabase project for Preview deployments. Do not copy production secrets into Preview.

Before deployment, follow the [go-live checklist](./docs/launch/go-live-checklist.md). The release gate includes application, database, browser, and production-build checks.

## Architecture

Accepted technical decisions, system diagrams, trade-offs, and deferred scope are indexed in [`docs/architecture`](./docs/architecture/README.md). The relational schema and ER diagrams are documented in [`docs/data-model.md`](./docs/data-model.md), with database authorization detailed in [`docs/security/rls-policies.md`](./docs/security/rls-policies.md).
