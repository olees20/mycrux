# Vercel environments and release process

Crux uses Vercel Preview and Production deployments with isolated backend resources. A preview is never a safe place for production member data or live Stripe credentials.

## Environment isolation

| Resource | Local/CI | Preview | Production |
| --- | --- | --- | --- |
| Supabase | Local disposable PostgreSQL/Supabase | Dedicated staging project | Dedicated production project |
| Stripe | Test placeholders or test mode | Dedicated Stripe test-mode account/configuration | Live-mode account/configuration |
| Site URL | Localhost | Vercel preview URL or stable staging alias | Canonical HTTPS domain |
| Webhooks | Local forwarding/test endpoint | Preview/staging endpoint and test signing secret | Production endpoint and live signing secret |
| Cron | Manual/local request | Disabled unless a stable staging alias is configured | Vercel Cron with production `CRON_SECRET` |

Configure Vercel values at the narrowest scope: Preview values only for Preview, Production values only for Production, and Development values only for local `vercel env pull`. Never copy a production Supabase URL/service-role key or Stripe live secret into Preview.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET` for the authenticated due-announcement job
- `INTEGRATION_WEBHOOK_SECRET` when generic provider webhooks are enabled
- `STRIPE_PLATFORM_PRICE_ID` when subscription checkout is enabled

Use at least 32 random bytes for webhook/cron secrets. `NEXT_PUBLIC_*` values are browser-visible; every other value is server-only. Environment validation intentionally fails the build when mandatory settings are missing.

## Pull request and release flow

1. CI installs from `package-lock.json`, runs lint, strict type-checking, unit/server tests, every migration plus the two-tenant SQL suite, Chromium accessibility/public smoke tests, and a production build using synthetic credentials.
2. Review SQL and application compatibility together. Use expand/migrate/contract changes: add backward-compatible schema first, deploy readers/writers second, and remove old schema only in a later release.
3. Apply reviewed migrations to the staging Supabase project. Run readiness, auth callback, Stripe test webhook, cross-tenant, upload, and critical-journey checks against the Preview deployment.
4. Merge only after required CI checks and Preview QA pass. Apply production migrations immediately before application code that depends on them; keep the old application compatible throughout the rollout.
5. Deploy Production, then verify `/api/health/live`, `/api/health/ready`, one member journey, one staff journey, Stripe webhook receipt, and the authenticated integration queue status.

Preview limitations: email delivery may be suppressed, Stripe remains test-only, provider webhooks need a stable staging URL, scheduled jobs are not assumed to run, data may be reset, and performance does not represent production scale. Preview deployments must display/use only synthetic or staging data.

## Migration failure and rollback

- CI database failure blocks deployment. A staging migration failure blocks production promotion.
- Do not automatically roll back a partially applied database migration. PostgreSQL files run transactionally in tests, but provider/platform operations may have external effects.
- Prefer a new reviewed forward-fix migration. Restore from a verified backup only when a forward fix cannot preserve correctness.
- Application rollback is allowed only while the previous code remains schema-compatible. Vercel rollback does not reverse Supabase migrations.
- Before high-risk changes, confirm a recent Supabase backup and rehearse restore/forward-fix steps. Record the migration version and deployment SHA in the release ticket.

## Secret rotation

1. Create a new provider secret/key without deleting the old one where overlap is supported.
2. Update the correct Vercel environment scope and redeploy. Verify readiness and a signed test event.
3. Rotate webhook endpoint signing secrets in Stripe/provider dashboards and update Vercel atomically; temporarily support dual verification only if implemented and time-bounded.
4. Revoke the old key, inspect audit/structured logs for misuse, and invalidate sessions if Auth signing material was involved.
5. Never place the secret value in a ticket, commit, build log, or chat message.

## Cron and custom domain readiness

`vercel.json` schedules only the justified, idempotent due-announcement processor, initially once daily at 08:00 UTC to fit the selected Vercel plan. Vercel sends `Authorization: Bearer $CRON_SECRET`; the route uses a constant-time comparison and the database RPC requires service-role access. This means scheduled announcements are not delivered with minute-level precision until a plan or external scheduler supports a tighter cadence. Do not add cleanup jobs until the operation is idempotent, observable, bounded, and has a runbook.

Before attaching a custom domain, verify ownership/DNS access, add the domain in Vercel, update `NEXT_PUBLIC_SITE_URL`, Supabase Auth redirect allow-lists, Stripe webhook destinations, email links, CSP host allow-lists if narrowed, and monitoring probes. Wait for managed TLS, test both apex and `www` redirect policy, then make the domain canonical. A custom domain is not required for initial launch.
