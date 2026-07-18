# Supabase database

The files in `migrations/` are the ordered source of truth for the database schema. Apply them only through the Supabase CLI or an equivalent controlled migration job; do not reproduce schema changes manually in the dashboard.

Typical local workflow once the Supabase CLI is installed:

```sh
supabase start
supabase db reset
```

`db reset` applies every migration in filename order and then runs `seed.sql`. The seed is idempotent, contains only fictional `example.invalid` users and a guest, and uses a deliberately public local-demo password. Never run demo seed data in production.

The complete synthetic inventory, role credentials, guided stakeholder journey and safe reset checks are documented in [`docs/demo/stakeholder-walkthrough.md`](../docs/demo/stakeholder-walkthrough.md).

Row Level Security is enabled and forced by the Prompt 4 migration. Policy intent and the privileged service-role boundary are documented in [`docs/security/rls-policies.md`](../docs/security/rls-policies.md). Run `tests/rls_security.sql` after migrations and seed when reviewing security changes.

Authentication profile creation, public join requests, and single-use invitation acceptance are covered by `tests/auth_onboarding.sql`.

Canonical staff-role delegation, audited invitation management, suspension, and denied permission boundaries are covered by `tests/staff_permissions.sql`.

Gym creation, owner configuration, accessible branding, controlled slugs, and tenant-scoped Storage policies are covered by `tests/gym_branding.sql`.

Announcement scheduling/expiry, staff audiences, notification idempotency, event changes, read state, and preference opt-outs are covered by `tests/notifications.sql`.

## Generated TypeScript types

After applying migrations to a local/disposable PostgreSQL database, regenerate the typed client schema with:

```sh
npm run db:types -- 'postgresql://USER@127.0.0.1:PORT/DATABASE'
```

The generator reads `information_schema` and PostgreSQL foreign-key catalogues, then replaces `src/lib/supabase/database.types.ts`. Use only a development database URL and never commit connection credentials.
