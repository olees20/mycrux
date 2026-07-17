# ADR 004: Enforce tenant isolation with Row Level Security

- Status: Accepted
- Date: 2026-07-17

## Context

Application checks alone are vulnerable to missing filters, compromised clients, and future query paths. Supabase exposes Postgres through APIs, so the database must enforce access.

## Decision

Enable RLS on every exposed table and deny access by default. Policies derive the user from `auth.uid()` and tenant access from active membership records; they never trust a client-supplied role or `gym_id`. Stable, security-definer helper functions may centralize membership checks only with a fixed `search_path`, minimal grants, and a design that avoids recursive policy evaluation.

Separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies express ownership and capability rules. Constraints, `WITH CHECK`, immutable-key triggers where needed, and column grants prevent changing tenant, role, author, or ownership fields. The service role bypasses RLS and therefore remains server-only and narrowly wrapped.

## Consequences and trade-offs

- Tenant isolation holds even when an application query forgets its tenant filter.
- Policies increase schema complexity and need integration tests using real JWT claims.
- Poor policy functions can recurse or reduce query performance; plans and indexes require review.
- RLS is not a substitute for request validation, rate limits, or safe response shaping.

## Alternatives considered

- Application-only authorization: rejected because one missed predicate can leak a tenant.
- Database roles per end user: operationally impractical with pooled HTTP access.
- Service-role access for all server queries: rejected because it discards defense in depth.

## Deferred decisions

Formal policy verification and per-tenant encryption keys are deferred. Prompt 4 will define and test table-specific policy intent.
