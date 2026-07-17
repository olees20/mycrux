# ADR 005: Use membership-scoped roles and capabilities

- Status: Accepted
- Date: 2026-07-17

## Context

A user can have different responsibilities at different gyms. Static global roles cannot represent that safely, and role names alone become brittle as staff duties evolve.

## Decision

Keep platform administration separate from gym membership. Gym access is attached to a membership with lifecycle state (`invited`, `active`, `suspended`, or `left`). Baseline roles are owner, staff, route setter, and member; guest access uses narrow signed flows rather than a durable gym role. Platform admin is a separately managed global grant used only through privileged server paths.

Authorize capabilities, not UI labels. Owners manage gym settings and staff; staff operate explicitly granted areas; route setters manage route content; members read published gym content and manage their own records. Sensitive actions require both an active membership and the relevant capability. The UI may hide controls but the server and RLS enforce the decision.

## Consequences and trade-offs

- One identity can switch gyms without privileges leaking between memberships.
- Capabilities are easier to evolve than hard-coded role comparisons, at the cost of more joins and policy design.
- Owner transfer and last-owner removal need transactional safeguards.
- Suspended and departed users retain auditable history without current access.

## Alternatives considered

- One global role per user: rejected because permissions differ by gym.
- Fully custom RBAC in the MVP: flexible but too complex to configure and audit initially.
- Authorization only in JWT custom claims: claims become stale and awkward across multiple gyms.

## Deferred decisions

Gym-defined roles, enterprise groups, temporary elevated access, and delegated platform support sessions are deferred.
