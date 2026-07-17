# Server utilities

Server-only authorization, logging, and integration helpers belong here.

## Privileged database access

The Supabase service-role key is consumed only inside `src/lib/supabase/admin.ts`. That module imports `server-only`, keeps the raw client private, validates token hashes, and exposes narrow invitation/guest/pass lookup operations. Future privileged operations must follow the same pattern. The key is reserved for verified Stripe webhooks, signed guest invitation/waiver/pass exchanges, platform administration, and controlled maintenance.

Never import the service-role key into Client Components, browser helpers, shared UI code, or general-purpose data access. Normal server requests must use the caller's Supabase session so RLS remains active.

## Gym context

Tenant pages use `requireActiveGymContext` with the route slug. Use the returned `gym.id` for every tenant query. Route parameters, form values, cookies, and future custom-domain hostnames are untrusted hints and must never be used as a `gym_id` directly. Only active memberships enter the accessible-gym set; RLS remains enabled on every query.
