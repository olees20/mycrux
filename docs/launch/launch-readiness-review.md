# Launch-readiness review

Review date: 18 July 2026. Scope: the repository, migrations, automated tests, and operational documentation for a limited first-gym pilot. This is not legal advice, an accessibility certification, a penetration test, or evidence that external production services have been configured.

## Decision

**Repository status: ready for controlled staging acceptance; not yet approved for a production pilot.** The codebase has no known repository-owned launch blocker. Five external/operational gates remain and each has an accountable role, due date, and required evidence below. Go live only when every blocker is marked complete in the release ticket.

## Launch blockers

| Gate | Owner | Due date | Completion evidence |
| --- | --- | --- | --- |
| Provision isolated production Vercel, Supabase, Stripe live-mode, email and DNS resources; configure scoped secrets and redirect/webhook allow-lists | Platform engineer | 24 July 2026 | Redacted environment matrix, successful production migration record, TLS/DNS check, signed Stripe test/live verification, and healthy probes |
| Obtain UK legal review of Terms, Privacy Notice, data-processing terms, cookie use, waiver wording/e-signature process, retention schedule and gym/controller responsibilities | Product owner with legal counsel | 27 July 2026 | Versioned approved documents, approval date, counsel/contact, and published links; the synthetic waiver is never promoted as legal text |
| Enable a managed error reporter, external uptime probes and routed paging with privacy-safe fields; exercise one test alert | Platform engineer | 24 July 2026 | Provider project/dashboard links, redacted sample event with correlation ID, alert delivery screenshot and named on-call rota |
| Confirm production backup/PITR coverage and perform a timed restore into an isolated project, including tenant and auth/data-integrity checks | Platform engineer | 27 July 2026 | Restore ticket with backup timestamp, recovery time, migration version, row-count/integrity results and disposal confirmation |
| Complete documented keyboard, screen-reader, zoom, contrast and mobile acceptance testing on the production-like build | Product owner with accessibility tester | 27 July 2026 | Completed manual checklist with browser/AT matrix, defects, owners and retest results; no critical or serious unresolved issue |

Changing a due date requires the product owner to record the reason and replacement date. A blocker cannot be waived silently.

## Evidence by launch area

| Area | Repository evidence | Assessment |
| --- | --- | --- |
| Functionality | Member/staff/platform routes cover gym setup, roles, walls/routes, ascents, check-in, events, announcements, community/chat, competitions, waivers, privacy, exports and SaaS billing. Deterministic two-gym walkthrough data covers primary roles. | Ready for staging acceptance. Provider adapters and member commerce are explicitly out of scope. |
| Tenant security | Tenant-keyed schema, forced RLS, privileged RPC checks, service-role separation, signed webhooks, security headers, input/media validation and cross-gym SQL tests. | Strong repository baseline; production edge throttling, exact CSP hosts and external review remain must-fix soon. |
| Privacy | Private defaults, consent records, scoped exports, tracked deletion requests, audited platform support without impersonation, retention documentation and log redaction. | Blocked on approved public notices, processing agreements and an operational request-handling owner. |
| Accessibility | Semantic layouts, skip navigation, accessible alternatives for visual route/statistics content, responsive work and automated axe smoke coverage. | Blocked on manual assistive-technology acceptance; automated tests are not certification. |
| Billing | Stripe Checkout/Portal for gym SaaS only, signature verification, idempotent event projection, entitlement/grace handling and tenant tests. | Code ready; live product/price, tax/account settings, cancellation/refund/support policy and live webhook verification are external gates. |
| Support | Privacy-minimising platform console, audited suspension/restoration, support references and incident runbooks. | Must publish support channel/hours, escalation owner and severity response targets before onboarding. No tenant impersonation is supported. |
| Data recovery | Forward-only release policy and migration failure runbook exist; migrations and seed/reset are repeatable locally. | Blocked until a real provider backup restoration is rehearsed and recovery objectives are approved. |
| Monitoring | Correlation IDs, redacted structured events, liveness/readiness and authenticated integration queue health exist, with proposed alert thresholds. | Blocked until managed providers and paging are connected and tested. |
| Legal/compliance | Product boundaries and retention/consent mechanisms are documented. | Blocked on specialist review; no claim of UK GDPR, consumer-law, e-signature or WCAG conformance is made. |
| Operations | CI/release flow, secret rotation, incidents, daily cron and environment isolation are documented. | Ready once named humans accept the rota and complete the go-live evidence. Daily 08:00 UTC announcements are not precise scheduling. |

## Must fix soon

These do not block a tightly controlled pilot if the product owner accepts and records the limits.

| Item | Owner | Target date | Exit criterion |
| --- | --- | --- | --- |
| Replace process-local authentication throttling with shared edge/WAF limits and verify proxy IP trust | Platform engineer | 7 August 2026 | Distributed tests and edge configuration evidence |
| Narrow CSP/connect/image allow-lists to final production hosts and plan a nonce-based CSP | Platform engineer | 7 August 2026 | Header test on canonical HTTPS domain |
| Establish dependency update ownership and resolve/accept the documented upstream PostCSS advisory | Platform engineer | 31 July 2026 | Recorded advisory decision and automated dependency PRs |
| Publish support hours, incident severity targets and deletion/export request service levels | Product owner | 31 July 2026 | Public support policy and internal queue owner |
| Decide whether daily scheduled announcements satisfy the pilot; otherwise fund/configure a finer scheduler | Product owner | 31 July 2026 | Signed product decision or verified scheduler |
| Add malware scanning/transcoding before enabling video uploads at scale | Platform engineer | 14 August 2026 | Quarantine/scanning pipeline and failure tests, or video remains disabled by policy |

## Later improvements

- Infrastructure as code, multi-region strategy, formal recovery objectives and recurring restore drills.
- Independent penetration test and formal accessibility audit before broad public scale.
- Dedicated background workers, finer scheduled delivery and provider-specific gym-management adapters.
- Member payments, refunds, tax, KYC/payout workflows and native mobile applications remain outside MVP scope.
- Phase-two 3D/AI work remains an isolated discovery track; it must not alter the canonical 2D route workflow.

## Operational ownership

| Responsibility | Accountable role | Backup/escalation |
| --- | --- | --- |
| Release approval, scope and legal sign-off | Product owner | Legal counsel for legal text; gym owner for local operating policy |
| Hosting, database, migrations, secrets, backups, monitoring and incidents | Platform engineer | Product owner for business-impact decisions |
| Billing configuration and customer policy | Product owner | Platform engineer for Stripe delivery; finance/legal adviser for tax and terms |
| First-gym data, staff training, waiver activation and acceptance testing | Gym onboarding lead | Gym owner |
| Security/privacy requests and incident coordination | Product owner | Platform engineer plus legal counsel as required |

The release ticket is the source of truth for human names, contact details, rota coverage and completion evidence. Role labels alone are not sufficient at go-live.

## Verification baseline

At this review, `npm run test:ci` passes 28 files/85 tests, the complete SQL migration/RLS suite passes on a fresh disposable database, the seed reapplies idempotently, and the production Next.js build succeeds with synthetic credentials. Re-run all gates at the target release SHA; this point-in-time result is not transferable to a later commit.
