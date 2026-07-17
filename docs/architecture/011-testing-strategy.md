# ADR 011: Use a layered testing strategy

- Status: Accepted
- Date: 2026-07-17

## Context

The highest risks are tenant leakage, privilege escalation, auth redirects, billing entitlement errors, and destructive migrations. UI-only tests cannot prove database policy behavior, while exhaustive end-to-end suites are slow and brittle.

## Decision

Use four complementary layers:

1. Unit tests for pure validation, authorization decisions, transformations, and billing state mapping.
2. Component tests for accessible interaction and error states.
3. SQL/integration tests against a disposable Supabase database for migrations, constraints, RLS allow/deny cases, storage policies, and concurrent mutations.
4. A small end-to-end suite for critical role journeys across two gyms, including authentication, tenant switching, staff boundaries, and Stripe test-mode subscription flows.

Every security regression begins with a failing test. Fixtures use synthetic identities and deterministic tenant IDs. CI runs lint, strict type-check, unit/component tests, migration reset, RLS tests, end-to-end smoke tests, and production build in increasing-cost stages.

## Consequences and trade-offs

- Fast tests cover most behavior while real-service tests protect trust boundaries.
- Integration environments take longer and require disciplined seed cleanup.
- Mocks are prohibited as evidence for RLS, webhook signatures, or database constraints.
- End-to-end coverage remains selective to control runtime and flakiness.

## Alternatives considered

- End-to-end tests only: realistic but slow, hard to diagnose, and incomplete for policy matrices.
- Unit tests only: fast but unable to validate framework and database boundaries.
- Manual QA only: non-repeatable and unsuitable for multi-tenant security.

## Deferred decisions

Load testing thresholds, visual regression service, mutation testing, and production synthetic monitoring tooling are selected in production-readiness stages.
