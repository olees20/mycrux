# Automated testing

`npm test` runs fast validation, permission, scoring, metrics, media and server-route tests. `npm run test:db` applies every migration to an empty local PostgreSQL database, loads synthetic fixtures and executes the RLS/integration suite. Set `TEST_DATABASE_URL` to a local database only; the runner refuses remote hosts. Tenant-security fixtures create or use at least two gyms and explicitly assert cross-gym denial.

`npm run test:e2e` runs Playwright on desktop Chromium and a mobile viewport. The public authentication checks need no backend. Set `E2E_SUPABASE=true`, point the app at a locally reset Supabase project and load `supabase/seed.sql` to exercise the seeded member, owner, setter, front-desk and platform-admin journeys. All identities use `example.invalid` and the documented local-only password. Never point E2E at production.

When a test fails, Vitest prints the source test, SQL prints the failing fixture filename, and Playwright retains a trace and failure screenshot. CI uses synthetic placeholder environment variables and local Postgres/Supabase resources; no production credentials are required.
