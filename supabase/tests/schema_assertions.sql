-- Run after migrations and seed with psql ON_ERROR_STOP enabled.

do $$
declare
  expected_tables text[] := array[
    'announcements', 'ascent_logs', 'audit_logs', 'billing_customers',
    'channel_members', 'chat_channels', 'comments', 'community_posts',
    'competition_routes', 'competitions', 'event_registrations', 'events',
    'favourites', 'feature_entitlements', 'guest_invites', 'gym_branding',
    'gym_domains', 'gym_memberships', 'gyms', 'invitations', 'messages',
    'notification_preferences', 'notifications', 'partner_requests', 'passes',
    'profiles', 'reactions', 'route_feedback', 'route_media', 'route_tags',
    'routes', 'score_entries', 'staff_roles', 'subscriptions',
    'waiver_acceptances', 'waiver_versions', 'waivers', 'wall_images', 'walls'
  ];
  missing_tables text[];
  missing_gym_ids text[];
begin
  select array_agg(expected.table_name order by expected.table_name)
  into missing_tables
  from unnest(expected_tables) as expected(table_name)
  where not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = expected.table_name
  );

  if missing_tables is not null then
    raise exception 'Missing required tables: %', missing_tables;
  end if;

  select array_agg(expected.table_name order by expected.table_name)
  into missing_gym_ids
  from unnest(expected_tables) as expected(table_name)
  -- Profiles and gyms are global roots; audit logs may describe platform-wide events.
  where expected.table_name not in ('profiles', 'gyms', 'audit_logs')
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = expected.table_name
        and column_name = 'gym_id'
        and is_nullable = 'NO'
    );

  if missing_gym_ids is not null then
    raise exception 'Tenant tables missing a required gym_id: %', missing_gym_ids;
  end if;

  if (select count(*) from public.gyms where slug = 'demo-crux-centre') <> 1 then
    raise exception 'Expected exactly one demo gym';
  end if;

  if (
    select count(*)
    from public.gym_memberships
    where gym_id = '30000000-0000-4000-8000-000000000001'
      and status = 'active'
  ) <> 4 then
    raise exception 'Expected four representative active demo memberships';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000005'
      and is_platform_admin
  ) then
    raise exception 'Expected the representative platform administrator';
  end if;

  if not exists (
    select 1 from public.guest_invites
    where id = '55000000-0000-4000-8000-000000000001'
      and status = 'pending'
  ) then
    raise exception 'Expected the representative guest preregistration';
  end if;
end;
$$;

-- Every relationship between two tenant tables must carry the child's gym_id.
do $$
declare
  unsafe_foreign_keys text[];
begin
  with tenant_foreign_keys as (
    select
      constraint_row.conname,
      child.relname as child_table,
      parent.relname as parent_table,
      array(
        select attribute_row.attname
        from unnest(constraint_row.conkey) as key_column
        join pg_attribute attribute_row
          on attribute_row.attrelid = constraint_row.conrelid
         and attribute_row.attnum = key_column
      ) as child_columns
    from pg_constraint constraint_row
    join pg_class child on child.oid = constraint_row.conrelid
    join pg_namespace child_namespace
      on child_namespace.oid = child.relnamespace
     and child_namespace.nspname = 'public'
    join pg_class parent on parent.oid = constraint_row.confrelid
    where constraint_row.contype = 'f'
      and exists (
        select 1 from pg_attribute
        where attrelid = child.oid and attname = 'gym_id' and not attisdropped
      )
      and exists (
        select 1 from pg_attribute
        where attrelid = parent.oid and attname = 'gym_id' and not attisdropped
      )
  )
  select array_agg(child_table || '.' || conname order by child_table, conname)
  into unsafe_foreign_keys
  from tenant_foreign_keys
  where not ('gym_id' = any(child_columns));

  if unsafe_foreign_keys is not null then
    raise exception 'Tenant foreign keys missing gym_id: %', unsafe_foreign_keys;
  end if;
end;
$$;

-- Tenant filters are ubiquitous; every gym-owned table needs an index led by gym_id.
do $$
declare
  unindexed_tenant_tables text[];
begin
  with tenant_tables as (
    select table_row.oid, table_row.relname
    from pg_class table_row
    join pg_namespace table_namespace on table_namespace.oid = table_row.relnamespace
    where table_namespace.nspname = 'public'
      and table_row.relkind = 'r'
      and exists (
        select 1 from pg_attribute
        where attrelid = table_row.oid and attname = 'gym_id' and not attisdropped
      )
  )
  select array_agg(tenant_tables.relname order by tenant_tables.relname)
  into unindexed_tenant_tables
  from tenant_tables
  where not exists (
    select 1
    from pg_index index_row
    join pg_attribute first_column
      on first_column.attrelid = tenant_tables.oid
     and first_column.attnum = index_row.indkey[0]
    where index_row.indrelid = tenant_tables.oid
      and first_column.attname = 'gym_id'
  );

  if unindexed_tenant_tables is not null then
    raise exception 'Tenant tables missing a gym_id-leading index: %', unindexed_tenant_tables;
  end if;
end;
$$;

-- A route cannot attach a wall from another gym because the FK includes gym_id.
do $$
begin
  insert into public.gyms (id, slug, name)
  values ('30000000-0000-4000-8000-000000000099', 'constraint-test-gym', 'Constraint Test Gym');

  insert into public.walls (id, gym_id, name)
  values (
    '60000000-0000-4000-8000-000000000099',
    '30000000-0000-4000-8000-000000000099',
    'Foreign Wall'
  );

  begin
    insert into public.routes (
      gym_id, wall_id, colour, grade, route_type
    )
    values (
      '30000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000099',
      'red', '5', 'boulder'
    );
    raise exception 'Cross-gym route parent was unexpectedly accepted';
  exception
    when foreign_key_violation then null;
  end;

  delete from public.gyms where id = '30000000-0000-4000-8000-000000000099';
end;
$$;
