# ADR 013: Resolve gym context from active server-side memberships

- Status: Accepted
- Date: 2026-07-17

## Context

One account may belong to several gyms. A URL slug, form field, cookie, hostname, or client-supplied `gym_id` is only a routing hint and cannot establish tenant access.

## Decision

Canonical member and staff URLs use `/g/[gymSlug]/...`. Every slug-scoped layout loads the authenticated user's active memberships through their ordinary Supabase session, filters out archived or unavailable gyms, and matches the slug only against that server-derived set. Missing, suspended, invited, left, or role-incompatible memberships cannot create a context and return a not-found response without exposing tenant details.

The `crux-active-gym` HTTP-only, same-site cookie stores only a preferred gym UUID. The switch action first resolves the submitted slug against active memberships, then writes the preference and redirects to the canonical local path. A stale preference falls back to the first accessible gym. Legacy `/app` and `/staff` entry points resolve this preference and redirect to a canonical path.

All tenant queries receive the validated context's `gym.id`; feature code must never query using a raw route parameter, cookie, hostname, or form `gym_id`. RLS remains the independent database boundary. `GymLocator` distinguishes slug lookup from the reserved custom-domain lookup mode so a future domain resolver can feed the same membership validation without changing authorization semantics.

Membership lifecycle states remain `invited`, `active`, `suspended`, and `left`. Only `active` participates in context resolution.

## Consequences and trade-offs

- Directly changing a slug cannot expose another gym, even when the gym exists.
- The preferred gym survives navigation and refresh without making the cookie an authorization credential.
- Switching requires a server round trip, which keeps validation and cookie mutation out of client code.
- Gym lists are loaded in layouts; later data-heavy pages may cache request-local context, but must not weaken session or RLS checks.

## Deferred decisions

Custom-domain verification and hostname-to-gym resolution remain deferred. They must return a locator hint and still pass through active-membership validation.
