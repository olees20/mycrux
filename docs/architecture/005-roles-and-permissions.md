# ADR 005: Use membership-scoped roles and capabilities

- Status: Accepted
- Date: 2026-07-17

## Context

A user can have different responsibilities at different gyms. Static global roles cannot represent that safely, and role names alone become brittle as staff duties evolve.

## Decision

Keep platform administration separate from gym membership. Gym access is attached to a membership with lifecycle state (`invited`, `active`, `suspended`, or `left`). Product roles are platform admin, gym owner, gym manager, route setter, front desk, moderator, and member. Storage keeps compact membership roles; manager, front-desk, and moderator duties are immutable system capability bundles. Guest access uses narrow signed flows rather than a durable gym role. Platform admin is a separately managed global grant used only through privileged server paths.

Authorize capabilities, not UI labels. Owners manage gym settings and staff; staff operate explicitly granted areas; route setters manage route content; members read published gym content and manage their own records. Sensitive actions require both an active membership and the relevant capability. The UI may hide controls but the server and RLS enforce the decision.

## Permission matrix

| Product role | Core permissions | Staff administration boundary |
| --- | --- | --- |
| Platform admin | Platform operations through reviewed service-role paths | No implicit tenant membership |
| Gym owner | Gym settings, staff, manager assignment, billing, all gym capabilities | May assign any non-owner staff bundle |
| Gym manager | Day-to-day content, events, routes, guests, waivers, competitions, moderation, standard staff administration | May assign route setter, front desk, or moderator; cannot create/manage owners or managers |
| Route setter | Routes, route feedback, competition scoring | None |
| Front desk | Events, guests/check-in, waivers, and passes | None |
| Moderator | Community, chat, and feedback moderation | None |
| Member | Published content and own personal records | None |

`src/lib/permissions.ts` is the application matrix. Matching system-role capability arrays are provisioned by the Prompt 8 migration. Database RPCs independently enforce delegation boundaries so changing a form or calling an RPC directly cannot grant broader access.

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
