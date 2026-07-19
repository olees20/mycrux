-- The reset removes application rows while preserving structure, reference data, buckets and Auth users.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
begin
  perform public.administrative_reset_application_data();
  raise exception 'Authenticated owner invoked the administrative reset';
exception when insufficient_privilege then null; end;
$$;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
do $$
declare
  first_result jsonb;
  second_result jsonb;
begin
  if not public.check_administrative_reset_access() then
    raise exception 'Service-role reset preflight failed';
  end if;
  first_result := public.administrative_reset_application_data();
  if exists(
    select 1 from pg_tables table_info
    where table_info.schemaname='public'
      and table_info.tablename not in('profiles','platform_plans')
      and not (first_result->'tables' ? ('public.'||table_info.tablename))
  ) then
    raise exception 'Reset inventory does not cover every application table';
  end if;
  if coalesce((first_result->'tables'->>'public.gyms')::bigint,0) = 0 then
    raise exception 'Reset did not report seeded gyms';
  end if;
  if exists(select 1 from public.gyms)
    or exists(select 1 from public.audit_logs)
    or exists(select 1 from public.billing_customers)
    or exists(select 1 from public.media_assets) then
    raise exception 'Reset left application data behind';
  end if;
  if not exists(select 1 from public.profiles) then
    raise exception 'Application-only reset deleted profiles';
  end if;
  if (select count(*) from public.platform_plans) <> 3 then
    raise exception 'Platform plan configuration was not preserved';
  end if;
  if (select count(*) from storage.buckets where id in(
    'gym-branding','wall-images','route-media','event-images','community-images','ascent-media'
  )) <> 6 then
    raise exception 'Storage bucket definitions were not preserved';
  end if;
  if to_regprocedure('public.join_gym_as_member(text,text)') is null
    or not exists(select 1 from pg_policies where schemaname='public') then
    raise exception 'Functions or RLS policies were not preserved';
  end if;

  second_result := public.administrative_reset_application_data();
  if coalesce((second_result->'tables'->>'public.gyms')::bigint,-1) <> 0
    or coalesce((second_result->'tables'->>'public.audit_logs')::bigint,-1) <> 0
    or coalesce((second_result->'tables'->>'private.action_rate_limits')::bigint,-1) <> 0 then
    raise exception 'Reset was not idempotent';
  end if;
end;
$$;

set local role postgres;
do $$
begin
  if not exists(select 1 from auth.users) then
    raise exception 'Application-only reset deleted Auth users';
  end if;
end;
$$;

rollback;
