# ADR 003: Use shared-schema multi-tenancy

- Status: Accepted
- Date: 2026-07-17

## Context

Many gyms share one deployment, while a person may belong to multiple gyms. Isolation must be reliable without making migrations and platform-wide operations unmanageable.

## Decision

Use one Postgres database and shared schema. Every gym-owned table carries a non-null `gym_id` foreign key unless it is securely scoped through a parent whose tenant cannot change. Prefer explicit `gym_id` even on deep children when it improves policy simplicity and indexing. Composite foreign keys or triggers prevent a child and parent from referencing different gyms.

Global user identity lives in `profiles`; `gym_memberships` associates a profile with a gym and membership state. URLs use a validated gym slug, while queries use the resolved gym UUID. Tenant tables index `gym_id` with common filters and archive state.

## Consequences and trade-offs

- One migration path and efficient cross-tenant platform operations.
- Tenant isolation depends on consistent schema constraints and RLS; omissions are high severity.
- Large tenants cannot be moved independently without export tooling.
- Shared compute can produce noisy-neighbor effects, which observability must expose.

## Alternatives considered

- Database per gym: strongest physical separation but costly migrations, pooling, and analytics.
- Schema per gym: still operationally complex and poorly supported by generated clients.
- Tenant identifier only in application code: rejected because it is not a security boundary.

## Deferred decisions

Custom domains are reserved through a domain mapping table. Tenant sharding, data residency, per-tenant encryption keys, and dedicated enterprise databases are deferred.
