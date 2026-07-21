-- Keep the local administrative reset complete as new tenant tables are added.
create or replace function public.administrative_reset_application_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_name text;
  table_count bigint;
  table_counts jsonb := '{}'::jsonb;
  truncate_targets text;
  profiles_preserved bigint;
  plans_preserved bigint;
begin
  for table_name in
    select tables.table_name
    from information_schema.tables tables
    where tables.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
      and tables.table_name not in ('profiles', 'platform_plans')
    order by tables.table_name
  loop
    execute format('select count(*) from public.%I', table_name) into table_count;
    table_counts := table_counts || jsonb_build_object('public.' || table_name, table_count);
  end loop;

  select count(*) into table_count from private.action_rate_limits;
  table_counts := table_counts || jsonb_build_object('private.action_rate_limits', table_count);
  select count(*) into table_count from private.gym_join_code_attempts;
  table_counts := table_counts || jsonb_build_object('private.gym_join_code_attempts', table_count);
  select count(*) into table_count from private.gym_join_credential_history;
  table_counts := table_counts || jsonb_build_object('private.gym_join_credential_history', table_count);
  select count(*) into profiles_preserved from public.profiles;
  select count(*) into plans_preserved from public.platform_plans;

  select string_agg(format('public.%I', tables.table_name), ', ' order by tables.table_name)
  into truncate_targets
  from information_schema.tables tables
  where tables.table_schema = 'public'
    and tables.table_type = 'BASE TABLE'
    and tables.table_name not in ('profiles', 'platform_plans');

  execute 'truncate table ' || truncate_targets ||
    ', private.action_rate_limits, private.gym_join_code_attempts, private.gym_join_credential_history restart identity cascade';

  return jsonb_build_object(
    'tables', table_counts,
    'profiles_preserved', profiles_preserved,
    'platform_plans_preserved', plans_preserved
  );
end;
$$;

revoke all on function public.administrative_reset_application_data() from public, anon, authenticated;
grant execute on function public.administrative_reset_application_data() to service_role;

comment on function public.administrative_reset_application_data() is
  'Destructively truncates all tenant/application base tables while preserving profiles, platform plan configuration, schema, RLS and functions.';
