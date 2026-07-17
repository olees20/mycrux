# Server utilities

Server-only authorization, logging, and integration helpers belong here.

## Privileged database access

The Supabase service-role key currently has no code consumer. Prompt 5 may introduce it only in `src/lib/supabase/admin.ts`, which must import `server-only` and expose narrow, audited operations rather than the raw privileged client. It is reserved for verified Stripe webhooks, signed guest invitation/waiver/pass exchanges, platform administration, and controlled maintenance.

Never import the service-role key into Client Components, browser helpers, shared UI code, or general-purpose data access. Normal server requests must use the caller's Supabase session so RLS remains active.
