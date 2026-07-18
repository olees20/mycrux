#!/usr/bin/env bash
set -euo pipefail

: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to an empty local PostgreSQL test database}"
case "$TEST_DATABASE_URL" in
  postgresql://*@localhost/*|postgresql://*@localhost:*/*|postgresql://*@127.0.0.1/*|postgresql://*@127.0.0.1:*/*) ;;
  *) echo "Refusing to run destructive fixtures against a non-local database" >&2; exit 2 ;;
esac

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap_auth.sql >/dev/null
for migration_file in supabase/migrations/*.sql; do psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f "$migration_file" >/dev/null; done
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/seed.sql >/dev/null
for test_file in supabase/tests/*.sql; do
  if [[ "$(basename "$test_file")" == "bootstrap_auth.sql" ]]; then continue; fi
  echo "database: $(basename "$test_file")"
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test_file" >/dev/null
done
