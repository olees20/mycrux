# Supabase clients

Use the client that matches the execution boundary:

- `browser.ts` — Client Components only; public URL and anonymous key.
- `server.ts` — Server Components and Server Actions using the caller's cookies and RLS.
- `route-handler.ts` — Route Handlers with writable auth cookies and RLS.
- `admin.ts` — narrow server-only token lookups using the service role; the raw client is not exported.

`database.types.ts` is generated from a migrated PostgreSQL database with `scripts/generate-database-types.mjs`. Do not edit it manually. Normal application code must use a session-bound client so RLS remains the authorization boundary.

The service-role key is imported only by `admin.ts`. Do not re-export that module from a shared barrel file, and never import it from a Client Component.
