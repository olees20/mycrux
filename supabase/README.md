# Supabase database

The files in `migrations/` are the ordered source of truth for the database schema. Apply them only through the Supabase CLI or an equivalent controlled migration job; do not reproduce schema changes manually in the dashboard.

Typical local workflow once the Supabase CLI is installed:

```sh
supabase start
supabase db reset
```

`db reset` applies every migration in filename order and then runs `seed.sql`. The seed is idempotent, contains only fictional `example.invalid` users and a guest, and uses a deliberately public local-demo password. Never run demo seed data in production.

Row Level Security is intentionally deferred to Prompt 4. Until those policies exist, this schema must not be exposed through a shared or production Supabase API.
