# Administrative database data reset

**npm run db:reset-data** is an interactive, operator-only tool. It is never imported by the application and never runs during development, builds, migrations, tests or deployment.

The reset preserves:

- all schemas, tables, functions, triggers, policies and grants;
- Supabase migration history;
- storage bucket definitions and storage policies;
- the **platform_plans** application reference data;
- Auth users and their **profiles** in the default application-data-only mode.

It removes all tenant and user-generated application records, including gyms, memberships, walls, routes, ascents, invitations, subscriptions, billing projections, integration records, notifications, audit records, privacy records and private rate-limit records. It uses one transactional **TRUNCATE ... RESTART IDENTITY CASCADE** over the explicitly audited application-table inventory. Uploaded files are removed through the Supabase Storage API from the six application-managed buckets; the buckets themselves remain.

The optional **--include-auth-users** flag additionally deletes every Supabase Auth user through the supported Admin API. The corresponding profiles then disappear through the existing Auth foreign-key cascade.

## Required environment

Load the server environment without adding secrets to source control:

~~~bash
set -a
source .env.local
set +a
~~~

The command requires:

- **NEXT_PUBLIC_SUPABASE_URL** or **SUPABASE_URL**;
- **SUPABASE_SERVICE_ROLE_KEY**;
- **ALLOW_DATABASE_RESET=true**.

The service-role key is used only by the Node.js operator script. Both legacy
service-role JWTs and current `sb_secret_...` Supabase secret keys are supported.
Never prefix it with **NEXT_PUBLIC_** and never expose it to browser code. Before
touching Storage, the tool calls a non-destructive RPC whose execute permission is
granted only to the database `service_role`.

If **NODE_ENV=production**, the tool also refuses to continue unless:

~~~bash
ALLOW_PRODUCTION_DATABASE_RESET=true
~~~

The tool prints the target project URL and mode, then requires a project-specific exact confirmation phrase in an interactive terminal. Piped or non-interactive confirmation is rejected.

## Application data only

This keeps Auth users and their profile records, but removes their gyms and all other application data:

~~~bash
ALLOW_DATABASE_RESET=true npm run db:reset-data
~~~

## Full reset, including Auth users

This is the command for a completely clean application:

~~~bash
ALLOW_DATABASE_RESET=true npm run db:reset-data -- --include-auth-users
~~~

For an intentionally targeted production environment, both acknowledgements are required:

~~~bash
NODE_ENV=production ALLOW_DATABASE_RESET=true ALLOW_PRODUCTION_DATABASE_RESET=true npm run db:reset-data -- --include-auth-users
~~~

After confirmation, the tool reports deleted rows per non-empty table, deleted objects per bucket, deleted Auth users, and the number of preserved profiles and platform plans. Running it repeatedly is safe: subsequent runs report zero for already-empty data.

## Applying the reset RPC

The operator script requires the service-role-only RPC from the latest migration. Apply migrations first:

~~~bash
npx supabase migration up --local
~~~

For a linked project:

~~~bash
npx supabase db push
~~~

The reset does not delete **supabase_migrations.schema_migrations**, storage buckets, or any schema object.
