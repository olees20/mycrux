# ADR 012: Deploy the web application on Vercel

- Status: Accepted
- Date: 2026-07-17

## Context

The Next.js application needs repeatable previews, managed TLS, environment separation, and a low-operations production path. Supabase and Stripe configuration must never cross environment boundaries.

## Decision

Deploy Next.js to Vercel. Pull requests receive Preview deployments connected only to development/staging Supabase and Stripe test mode. Production uses a separate Supabase project, Stripe live configuration, webhook secret, and explicit production domain. Environment variables are configured per Vercel environment and validated at build startup.

The release pipeline runs lint, strict type-check, tests, migration validation, and production build before deployment. Database migrations are forward-only, reviewed, and applied through a controlled release step before code that requires them. Webhook endpoints verify signatures and tolerate retries. Scheduled work must be short, idempotent, authenticated, and within platform limits.

`vercel.json` invokes the due-announcement processor every five minutes. Vercel supplies `Authorization: Bearer $CRON_SECRET`; the route rejects missing or mismatched secrets, and the underlying RPC independently requires the Supabase service role.

## Consequences and trade-offs

- Preview environments and Next.js hosting require little infrastructure work.
- Platform runtime, region, timeout, and pricing constraints affect design.
- App rollback does not roll back a database migration, so compatible expand/migrate/contract releases are required.
- Environment isolation costs more but prevents preview traffic reaching production data or billing.

## Alternatives considered

- Container platform: more runtime control with greater deployment and operational burden.
- Long-lived VM: inexpensive at small scale but weak previews, scaling, and isolation.
- Deploy Supabase and Next.js together: tighter infrastructure control but loses managed workflow benefits.

## Deferred decisions

Multi-region compute, disaster-recovery targets, blue/green database releases, dedicated workers, and infrastructure-as-code tooling are finalized during production readiness.

## Operational procedure

The environment matrix, CI gates, migration order, rollback/forward-fix policy, secret rotation steps, Preview limitations, and custom-domain checklist are maintained in [the Vercel release process](../deployment/vercel-release-process.md).
