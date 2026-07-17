# ADR 010: Maintain an append-only audit trail

- Status: Accepted
- Date: 2026-07-17

## Context

Changes to roles, waivers, routes, guest access, billing, and gym settings need accountable history for support, security, and compliance. Application logs alone are mutable and often lack business context.

## Decision

Write structured, append-only audit events for security- and business-significant mutations. Each event records gym scope where applicable, actor identity and actor type, action, target type and identifier, timestamp, request correlation ID, outcome, and a redacted metadata diff. Database triggers protect especially sensitive tables; server application code adds request context and external-event identifiers.

Ordinary users cannot insert, update, or delete audit events directly. Gym owners receive appropriately redacted tenant history; platform access is privileged and itself audited. Secrets, full tokens, payment details, waiver signatures, and unnecessary personal content are never copied into metadata.

## Consequences and trade-offs

- Investigations and support gain a durable event history.
- Storage grows continuously and needs retention, partitioning, and export policies.
- Trigger and application events require deduplication conventions.
- Audit records improve evidence but do not replace operational logs and metrics.

## Alternatives considered

- Application logs only: insufficiently durable and difficult to expose per tenant.
- Database triggers only: reliable for data changes but lack request and external-system context.
- Full event sourcing: powerful reconstruction, but excessive complexity for the MVP.

## Deferred decisions

Cryptographic tamper evidence, external SIEM export, legal retention periods, and audit-log partition cadence await compliance and volume evidence.
