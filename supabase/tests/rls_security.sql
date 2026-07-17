-- Prompt 4 RLS tests. Run after all migrations and seed as a database superuser.

begin;

do $$
declare
  unprotected_tables text[];
  policyless_tables text[];
begin
  select array_agg(table_row.relname order by table_row.relname)
  into unprotected_tables
  from pg_class table_row
  join pg_namespace table_namespace on table_namespace.oid = table_row.relnamespace
  where table_namespace.nspname = 'public'
    and table_row.relkind = 'r'
    and (not table_row.relrowsecurity or not table_row.relforcerowsecurity);

  if unprotected_tables is not null then
    raise exception 'Tables missing forced RLS: %', unprotected_tables;
  end if;

  select array_agg(table_row.relname order by table_row.relname)
  into policyless_tables
  from pg_class table_row
  join pg_namespace table_namespace on table_namespace.oid = table_row.relnamespace
  where table_namespace.nspname = 'public'
    and table_row.relkind = 'r'
    and not exists (
      select 1 from pg_policy where polrelid = table_row.oid
    );

  if policyless_tables is not null then
    raise exception 'Tables missing an explicit policy: %', policyless_tables;
  end if;
end;
$$;

-- A second tenant and representative member/route are fixtures for isolation checks.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000098', 'other-member@crux.example.invalid');

insert into public.profiles (id, display_name)
values ('10000000-0000-4000-8000-000000000098', 'Other Gym Member');

insert into public.gyms (id, slug, name)
values ('30000000-0000-4000-8000-000000000098', 'other-demo-gym', 'Other Demo Gym');

insert into public.gym_memberships (
  id, gym_id, profile_id, role, status, joined_at
)
values (
  '50000000-0000-4000-8000-000000000098',
  '30000000-0000-4000-8000-000000000098',
  '10000000-0000-4000-8000-000000000098',
  'member', 'active', now()
);

insert into public.walls (id, gym_id, name)
values (
  '60000000-0000-4000-8000-000000000098',
  '30000000-0000-4000-8000-000000000098',
  'Other Wall'
);

insert into public.routes (
  id, gym_id, wall_id, name, colour, grade, status, published_at
)
values (
  '70000000-0000-4000-8000-000000000098',
  '30000000-0000-4000-8000-000000000098',
  '60000000-0000-4000-8000-000000000098',
  'Other Tenant Route', 'blue', '5', 'published', now()
);

insert into public.chat_channels (id, gym_id, created_by, name)
values (
  'a0000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'security-test-channel'
);

insert into public.channel_members (
  id, gym_id, channel_id, profile_id, membership_role
)
values (
  'a1000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'member'
);

insert into public.community_posts (
  id, gym_id, author_id, body, moderation_status
)
values (
  'a2000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'Moderated security test post',
  'hidden'
);

insert into public.notifications (
  id, gym_id, profile_id, notification_type, title, body
)
values (
  'a3000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'security.test', 'Security test', 'Trusted server content'
);

-- Demo member: own tenant is visible, other tenant is invisible.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

do $$
begin
  if (select count(*) from public.gyms) <> 1 then
    raise exception 'Member must see exactly one gym';
  end if;

  if exists (
    select 1 from public.gyms
    where id = '30000000-0000-4000-8000-000000000098'
  ) then
    raise exception 'Cross-gym read unexpectedly succeeded';
  end if;

  if not exists (
    select 1 from public.routes
    where id = '70000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Published own-gym route should be visible';
  end if;

  if exists (
    select 1 from public.routes
    where id = '70000000-0000-4000-8000-000000000098'
  ) then
    raise exception 'Cross-gym route read unexpectedly succeeded';
  end if;
end;
$$;

insert into public.ascent_logs (
  id, gym_id, route_id, profile_id, ascent_type
)
values (
  '90000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'flash'
);

do $$
declare
  affected_rows integer;
begin
  begin
    insert into public.ascent_logs (
      gym_id, route_id, profile_id, ascent_type
    )
    values (
      '30000000-0000-4000-8000-000000000098',
      '70000000-0000-4000-8000-000000000098',
      '10000000-0000-4000-8000-000000000004',
      'flash'
    );
    raise exception 'Cross-gym ascent insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  update public.gym_memberships
  set role = 'owner'
  where profile_id = '10000000-0000-4000-8000-000000000004';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'Member role escalation unexpectedly updated % rows', affected_rows;
  end if;

  begin
    insert into public.gym_memberships (
      gym_id, profile_id, role, status, joined_at
    )
    values (
      '30000000-0000-4000-8000-000000000098',
      '10000000-0000-4000-8000-000000000004',
      'owner', 'active', now()
    );
    raise exception 'Cross-gym owner membership insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set is_platform_admin = true
    where id = '10000000-0000-4000-8000-000000000004';
    raise exception 'Platform-admin escalation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.ascent_logs
    set gym_id = '30000000-0000-4000-8000-000000000098'
    where id = '90000000-0000-4000-8000-000000000001';
    raise exception 'Protected gym_id update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.channel_members
    set membership_role = 'moderator'
    where id = 'a1000000-0000-4000-8000-000000000001';
    raise exception 'Channel moderator escalation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.community_posts
    set moderation_status = 'visible'
    where id = 'a2000000-0000-4000-8000-000000000001';
    raise exception 'Author unexpectedly reversed moderation';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.notifications
    set body = 'Tampered client content'
    where id = 'a3000000-0000-4000-8000-000000000001';
    raise exception 'Notification payload tampering unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Route setter can create routes only in their own gym.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

insert into public.routes (
  id, gym_id, wall_id, name, colour, grade, status, setter_id
)
values (
  '70000000-0000-4000-8000-000000000097',
  '30000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'Setter Test Route', 'orange', '5+', 'draft',
  '10000000-0000-4000-8000-000000000003'
);

do $$
begin
  begin
    insert into public.routes (
      gym_id, wall_id, name, colour, grade, status, setter_id
    )
    values (
      '30000000-0000-4000-8000-000000000098',
      '60000000-0000-4000-8000-000000000098',
      'Forbidden Route', 'orange', '5+', 'draft',
      '10000000-0000-4000-8000-000000000003'
    );
    raise exception 'Cross-gym route creation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- JWT platform-admin flag does not bypass tenant policies.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

do $$
begin
  if exists (select 1 from public.gyms) then
    raise exception 'Platform admin JWT unexpectedly bypassed tenant RLS';
  end if;
end;
$$;

-- Only the server-side BYPASSRLS role has controlled cross-tenant visibility.
set local role service_role;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  if (select count(*) from public.gyms) <> 2 then
    raise exception 'Service role should see both test gyms';
  end if;
end;
$$;

-- Anonymous guests cannot enumerate token-bearing tables directly.
set local role anon;
do $$
begin
  begin
    perform 1 from public.guest_invites;
    raise exception 'Anonymous guest invite read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
