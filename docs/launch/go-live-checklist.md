# Go-live checklist

Use one release ticket and attach evidence rather than secrets or personal data. Record the release SHA, migration version, environment, UTC times and named approvers. Every checkbox is required unless marked not applicable with product-owner approval and a reason; launch-readiness blockers cannot be waived.

## Seven days before

- [ ] Assign named people to every role in the [launch-readiness review](./launch-readiness-review.md), including on-call and backup contacts.
- [ ] Confirm the pilot scope, supported browsers, support hours, acceptable daily announcement cadence, capacity limits and rollback decision-maker.
- [ ] Obtain dated legal approval and publish versioned Terms, Privacy Notice, data-processing terms, cookie information, retention policy and reviewed waiver process.
- [ ] Confirm the production Supabase project is isolated from staging, backups/PITR are enabled, and a restore rehearsal has passed.
- [ ] Confirm Vercel Production and Preview use different Supabase projects, Stripe modes, site URLs and webhook secrets.
- [ ] Configure canonical domain/TLS, apex/`www` policy, Supabase Auth redirects, email links, Stripe endpoints and exact platform allow-lists.
- [ ] Connect privacy-safe error reporting and external uptime checks; test warning/page delivery to the current rota.
- [ ] Complete the manual accessibility checklist on a production-like deployment and close critical/serious findings.
- [ ] Complete two-tenant, role, billing, waiver, deletion/export and mobile acceptance using only synthetic staging data.

## Release candidate

- [ ] Freeze the release SHA and record the last migration filename.
- [ ] Run `npm ci`, `npm run test:ci`, `npm run test:db`, `npm run test:e2e` and `npm run build`; attach outputs.
- [ ] Review dependency audit results, migration SQL, RLS changes, generated types, environment validation and unresolved exceptions.
- [ ] Verify staging liveness/readiness, authentication and email callback, uploads, member/staff journeys, Stripe signed/tampered/replayed webhooks, daily cron authentication and integration queue health.
- [ ] Confirm Preview contains no production data, live Stripe keys or production service-role key.
- [ ] Confirm a recent production backup, forward-fix plan and schema-compatible application rollback target.
- [ ] Obtain product, platform and first-gym acceptance on the exact SHA.

## Production release

- [ ] Announce the change window and open the incident channel/ticket.
- [ ] Apply reviewed forward-only migrations before dependent code; record start/end, actor and result.
- [ ] Deploy the frozen SHA with production-scoped variables; do not copy values into the ticket.
- [ ] Verify `GET /api/health/live` and `GET /api/health/ready` over canonical HTTPS and capture correlation IDs.
- [ ] Verify registration/login/reset, one member journey, one staff journey and tenant switching/isolation with designated synthetic production smoke accounts.
- [ ] Send a signed Stripe event and confirm one idempotent projection; inspect the authenticated integration queue.
- [ ] Invoke/observe the announcement job with valid authentication and confirm invalid authentication is rejected.
- [ ] Confirm CSP/security headers, error capture, uptime probes, paging and redacted production logs.

## First 24 hours

- [ ] Monitor readiness, 5xx, authentication, uploads, webhook backlog/dead letters, cron and Stripe subscription state at launch, +1 hour, +4 hours and +24 hours.
- [ ] Review support contacts and the first gym’s check-in, waiver and role audit events without browsing unnecessary member content.
- [ ] Record defects with severity, owner and target date; invoke the incident runbook for sustained user impact or integrity risk.
- [ ] Confirm no secret, waiver signature, message body, payment payload or email address entered telemetry.
- [ ] Hold a 24-hour release review and record continue, restrict or rollback/forward-fix decision.

## Stop conditions

Stop or restrict launch for failed tenant isolation, unverifiable waiver state, incorrect billing entitlement, missing backup, migration ambiguity, serious accessibility barrier, leaked secret/personal data, unhealthy readiness, unhandled webhook backlog, or unavailable incident ownership. Prefer a reviewed forward fix; application rollback is safe only when the previous code is schema-compatible.
