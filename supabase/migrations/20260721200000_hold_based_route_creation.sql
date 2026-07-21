-- Digital-twin routes: current route records remain compatible while immutable
-- revisions capture every definition and its selected physical holds.

alter table public.routes
  add column history_revision bigint not null default 0 check (history_revision >= 0),
  add column history_ready boolean not null default true,
  add column duplicated_from_route_id uuid,
  add constraint routes_duplicated_from_fkey
    foreign key (duplicated_from_route_id, gym_id)
    references public.routes(id, gym_id) on delete restrict;

create table public.route_holds (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  hold_id uuid not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (route_id, hold_id),
  constraint route_holds_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete cascade,
  constraint route_holds_hold_fkey
    foreign key (hold_id, gym_id) references public.wall_holds(id, gym_id) on delete restrict
);

create index route_holds_gym_hold_idx on public.route_holds(gym_id, hold_id, route_id);

create table public.route_versions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  version bigint not null check (version > 0),
  change_kind text not null check (change_kind in ('create','edit','publish','retire','archive','duplicate')),
  name text,
  colour text not null,
  grade_system text not null,
  grade text not null,
  route_type text not null,
  status text not null,
  wall_id uuid not null,
  wall_name text not null,
  setter_id uuid,
  setter_name text,
  set_on date,
  retire_on date,
  description text,
  overlay jsonb,
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  constraint route_versions_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete restrict,
  constraint route_versions_route_version_key unique(route_id, version),
  constraint route_versions_id_gym_key unique(id, gym_id)
);

create index route_versions_gym_route_version_idx
  on public.route_versions(gym_id, route_id, version desc);

create table public.route_version_holds (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_version_id uuid not null,
  hold_id uuid not null,
  category text not null,
  icon_key text not null,
  position_x_metres numeric(10,3) not null,
  position_y_metres numeric(10,3) not null,
  rotation_degrees numeric(7,3) not null,
  scale_factor numeric(6,3) not null,
  metadata jsonb not null,
  primary key(route_version_id, hold_id),
  constraint route_version_holds_version_fkey
    foreign key(route_version_id, gym_id)
    references public.route_versions(id, gym_id) on delete restrict
);

create index route_version_holds_gym_hold_idx
  on public.route_version_holds(gym_id, hold_id, route_version_id);

alter table public.route_holds enable row level security;
alter table public.route_versions enable row level security;
alter table public.route_version_holds enable row level security;

create policy route_holds_select_member on public.route_holds
for select to authenticated using (
  private.can_read_route(route_id, gym_id)
  or private.has_gym_capability(gym_id, 'routes.manage')
);
create policy route_versions_select_manager on public.route_versions
for select to authenticated using (private.has_gym_capability(gym_id, 'routes.manage'));
create policy route_version_holds_select_manager on public.route_version_holds
for select to authenticated using (private.has_gym_capability(gym_id, 'routes.manage'));

revoke insert, update, delete on public.route_holds from authenticated;
revoke insert, update, delete on public.route_versions from authenticated;
revoke insert, update, delete on public.route_version_holds from authenticated;
grant select on public.route_holds, public.route_versions, public.route_version_holds to authenticated;

create or replace function private.advance_route_history_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.history_ready and current_user <> 'postgres' then
    raise exception 'Route history cannot be bypassed' using errcode='42501';
  end if;
  new.history_revision := case when tg_op = 'INSERT' and not new.history_ready then 0 when tg_op = 'INSERT' then 1 else old.history_revision + 1 end;
  return new;
end;
$$;

create or replace function private.capture_route_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  version_id uuid;
  change_type text;
begin
  if not new.history_ready then return new; end if;
  change_type := case
    when tg_op = 'INSERT' and new.duplicated_from_route_id is not null then 'duplicate'
    when tg_op = 'INSERT' then 'create'
    when old.history_revision = 0 and new.duplicated_from_route_id is not null then 'duplicate'
    when old.history_revision = 0 then 'create'
    when old.status <> 'archived' and new.status = 'archived' then 'archive'
    when old.status <> 'published' and new.status = 'published' then 'publish'
    when old.status <> 'retired' and new.status = 'retired' then 'retire'
    else 'edit'
  end;

  insert into public.route_versions(
    gym_id, route_id, version, change_kind, name, colour, grade_system, grade,
    route_type, status, wall_id, wall_name, setter_id, setter_name, set_on,
    retire_on, description, overlay, tags, changed_by
  ) values (
    new.gym_id, new.id, new.history_revision, change_type, new.name, new.colour,
    new.grade_system, new.grade, new.route_type, new.status, new.wall_id,
    coalesce((select wall.name from public.walls wall where wall.id = new.wall_id and wall.gym_id = new.gym_id), 'Unknown wall'),
    new.setter_id,
    (select profile.display_name from public.profiles profile where profile.id = new.setter_id),
    new.set_on, new.retire_on, new.description, new.overlay,
    coalesce((select jsonb_agg(tag.tag order by tag.tag) from public.route_tags tag where tag.route_id = new.id and tag.gym_id = new.gym_id), '[]'::jsonb),
    auth.uid()
  ) returning id into version_id;

  insert into public.route_version_holds(
    gym_id, route_version_id, hold_id, category, icon_key,
    position_x_metres, position_y_metres, rotation_degrees, scale_factor, metadata
  )
  select new.gym_id, version_id, hold.id, hold.category, hold.icon_key,
    hold.position_x_metres, hold.position_y_metres, hold.rotation_degrees,
    hold.scale_factor, hold.metadata
  from public.route_holds assignment
  join public.wall_holds hold on hold.id = assignment.hold_id and hold.gym_id = assignment.gym_id
  where assignment.route_id = new.id and assignment.gym_id = new.gym_id;
  return new;
end;
$$;

create trigger routes_advance_history_revision
before insert or update on public.routes
for each row execute function private.advance_route_history_revision();

create trigger routes_capture_version
after insert or update on public.routes
for each row execute function private.capture_route_version();

create or replace function public.protect_route_hold_integrity()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='routes' and new.wall_id is distinct from old.wall_id and exists(
    select 1 from public.route_holds assignment
    join public.wall_holds hold on hold.id=assignment.hold_id and hold.gym_id=assignment.gym_id
    where assignment.route_id=old.id and assignment.gym_id=old.gym_id and hold.wall_id<>new.wall_id
  ) then raise exception 'Selected holds must remain on the route face' using errcode='23514'; end if;
  if tg_table_name='wall_holds' and old.archived_at is null and new.archived_at is not null and exists(
    select 1 from public.route_holds assignment
    join public.routes route on route.id=assignment.route_id and route.gym_id=assignment.gym_id
    where assignment.hold_id=old.id and assignment.gym_id=old.gym_id and route.status<>'archived'
  ) then raise exception 'Remove this hold from active routes before archiving it' using errcode='23514'; end if;
  return new;
end;
$$;

create trigger routes_protect_hold_face
before update of wall_id on public.routes
for each row execute function public.protect_route_hold_integrity();
create trigger wall_holds_protect_route_membership
before update of archived_at on public.wall_holds
for each row execute function public.protect_route_hold_integrity();

-- Give every pre-existing route an initial immutable snapshot.
update public.routes set history_revision = history_revision;

create or replace function public.save_hold_based_route(
  target_gym_id uuid,
  target_route_id uuid,
  expected_revision bigint,
  target_wall_id uuid,
  definition jsonb,
  selected_hold_ids uuid[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved_route public.routes;
  current_route_id uuid;
  now_at timestamptz := now();
  selected_status text := definition->>'status';
  selected_setter uuid;
  selected_tags text[];
begin
  if not private.has_gym_capability(target_gym_id, 'routes.manage') then
    raise insufficient_privilege;
  end if;
  if jsonb_typeof(definition) <> 'object'
    or char_length(trim(coalesce(definition->>'name',''))) not between 1 and 120
    or char_length(trim(coalesce(definition->>'colour',''))) not between 1 and 40
    or char_length(trim(coalesce(definition->>'gradeSystem',''))) not between 1 and 30
    or char_length(trim(coalesce(definition->>'grade',''))) not between 1 and 20
    or coalesce(definition->>'routeType','') not in ('boulder','sport','top_rope','trad','training')
    or selected_status not in ('draft','published','retired')
    or char_length(coalesce(definition->>'description','')) > 2000 then
    raise exception 'Invalid route definition' using errcode = '22023';
  end if;
  if selected_hold_ids is null or cardinality(selected_hold_ids) < 1
    or cardinality(selected_hold_ids) > 10000
    or cardinality(selected_hold_ids) <> (select count(distinct value) from unnest(selected_hold_ids) value) then
    raise exception 'Select at least one unique hold' using errcode = '22023';
  end if;
  if not exists(select 1 from public.walls wall where wall.id=target_wall_id and wall.gym_id=target_gym_id and wall.wall_structure_id is not null and wall.is_active and wall.archived_at is null) then
    raise exception 'Climbing face not found' using errcode = '22023';
  end if;
  if (select count(*) from public.wall_holds hold where hold.id=any(selected_hold_ids) and hold.gym_id=target_gym_id and hold.wall_id=target_wall_id and hold.archived_at is null) <> cardinality(selected_hold_ids) then
    raise exception 'Every selected hold must be active on this face' using errcode = '22023';
  end if;

  selected_setter := nullif(definition->>'setterId','')::uuid;
  if selected_setter is not null and not exists(
    select 1 from public.gym_memberships membership
    where membership.gym_id=target_gym_id and membership.profile_id=selected_setter
      and membership.status='active' and membership.role in ('owner','staff','route_setter')
  ) then raise exception 'Setter is not active at this gym' using errcode = '22023'; end if;

  if jsonb_typeof(coalesce(definition->'tags','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(definition->'tags','[]'::jsonb)) > 30 then
    raise exception 'Invalid route tags' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct trim(value) order by trim(value)), '{}'::text[])
  into selected_tags from jsonb_array_elements_text(coalesce(definition->'tags','[]'::jsonb)) value
  where char_length(trim(value)) between 1 and 40;
  if cardinality(selected_tags) <> jsonb_array_length(coalesce(definition->'tags','[]'::jsonb)) then
    raise exception 'Invalid route tags' using errcode = '22023';
  end if;

  if target_route_id is null then
    insert into public.routes(
      gym_id, wall_id, name, colour, grade_system, grade, route_type, status,
      setter_id, set_on, retire_on, description, published_at, retired_at, history_ready
    ) values (
      target_gym_id, target_wall_id, trim(definition->>'name'), trim(definition->>'colour'),
      trim(definition->>'gradeSystem'), trim(definition->>'grade'), definition->>'routeType', selected_status,
      selected_setter, nullif(definition->>'setOn','')::date, nullif(definition->>'retireOn','')::date,
      nullif(trim(coalesce(definition->>'description','')),''),
      case when selected_status='published' then now_at end,
      case when selected_status='retired' then now_at end, false
    ) returning * into saved_route;
    current_route_id := saved_route.id;
  else
    select * into saved_route from public.routes
    where id=target_route_id and gym_id=target_gym_id and status <> 'archived' for update;
    if saved_route.id is null then raise exception 'Active route not found' using errcode='22023'; end if;
    if saved_route.history_revision <> expected_revision then
      raise exception 'Route changed in another session' using errcode='40001';
    end if;
    current_route_id := saved_route.id;
  end if;

  delete from public.route_holds assignment where assignment.route_id=current_route_id and assignment.gym_id=target_gym_id;
  insert into public.route_holds(gym_id,route_id,hold_id,assigned_by)
  select target_gym_id,current_route_id,value,auth.uid() from unnest(selected_hold_ids) value;
  delete from public.route_tags tag where tag.route_id=current_route_id and tag.gym_id=target_gym_id;
  insert into public.route_tags(gym_id,route_id,tag,created_by)
  select target_gym_id,current_route_id,value,auth.uid() from unnest(selected_tags) value;

  update public.routes set
    wall_id=target_wall_id, wall_image_id=null, name=trim(definition->>'name'),
    colour=trim(definition->>'colour'), grade_system=trim(definition->>'gradeSystem'),
    grade=trim(definition->>'grade'), route_type=definition->>'routeType', status=selected_status,
    setter_id=selected_setter, set_on=nullif(definition->>'setOn','')::date,
    retire_on=nullif(definition->>'retireOn','')::date,
    description=nullif(trim(coalesce(definition->>'description','')),''), overlay=null,
    history_ready=true,
    published_at=case when selected_status='published' then coalesce(published_at,now_at) else published_at end,
    retired_at=case when selected_status='retired' then coalesce(retired_at,now_at) else null end,
    archived_at=null
  where id=current_route_id and gym_id=target_gym_id returning * into saved_route;

  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user',case when target_route_id is null then 'route.created' else 'route.edited' end,'route',current_route_id,jsonb_build_object('revision',saved_route.history_revision,'hold_count',cardinality(selected_hold_ids)));
  return jsonb_build_object('route_id',current_route_id,'revision',saved_route.history_revision,'status',saved_route.status);
exception when invalid_text_representation or datetime_field_overflow or check_violation or not_null_violation then
  raise exception 'Invalid route definition' using errcode='22023';
end;
$$;

create or replace function public.archive_hold_based_route(target_gym_id uuid,target_route_id uuid,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.routes;
begin
  if not private.has_gym_capability(target_gym_id,'routes.manage') then raise insufficient_privilege; end if;
  select * into saved from public.routes where id=target_route_id and gym_id=target_gym_id for update;
  if saved.id is null then raise exception 'Route not found' using errcode='22023'; end if;
  if saved.status='archived' then return jsonb_build_object('route_id',saved.id,'revision',saved.history_revision,'status','archived'); end if;
  if saved.history_revision<>expected_revision then raise exception 'Route changed in another session' using errcode='40001'; end if;
  update public.routes set status='archived',archived_at=now() where id=saved.id returning * into saved;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','route.archived','route',saved.id,jsonb_build_object('revision',saved.history_revision));
  return jsonb_build_object('route_id',saved.id,'revision',saved.history_revision,'status','archived');
end;
$$;

create or replace function public.duplicate_hold_based_route(target_gym_id uuid,source_route_id uuid,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source public.routes; copied public.routes;
begin
  if not private.has_gym_capability(target_gym_id,'routes.manage') then raise insufficient_privilege; end if;
  select * into source from public.routes where id=source_route_id and gym_id=target_gym_id for update;
  if source.id is null then raise exception 'Route not found' using errcode='22023'; end if;
  if source.history_revision<>expected_revision then raise exception 'Route changed in another session' using errcode='40001'; end if;
  insert into public.routes(gym_id,wall_id,name,colour,grade_system,grade,route_type,status,setter_id,set_on,description,duplicated_from_route_id,history_ready)
  values(source.gym_id,source.wall_id,left(coalesce(source.name,source.colour||' '||source.grade)||' copy',120),source.colour,source.grade_system,source.grade,source.route_type,'draft',source.setter_id,current_date,source.description,source.id,false)
  returning * into copied;
  insert into public.route_holds(gym_id,route_id,hold_id,assigned_by)
  select gym_id,copied.id,hold_id,auth.uid() from public.route_holds where route_id=source.id and gym_id=source.gym_id;
  insert into public.route_tags(gym_id,route_id,tag,created_by)
  select gym_id,copied.id,tag,auth.uid() from public.route_tags where route_id=source.id and gym_id=source.gym_id;
  update public.routes set history_ready=true where id=copied.id returning * into copied;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','route.duplicated','route',copied.id,jsonb_build_object('source_route_id',source.id,'revision',copied.history_revision));
  return jsonb_build_object('route_id',copied.id,'revision',copied.history_revision,'status',copied.status);
end;
$$;

revoke all on function public.save_hold_based_route(uuid,uuid,bigint,uuid,jsonb,uuid[]) from public,anon;
revoke all on function public.archive_hold_based_route(uuid,uuid,bigint) from public,anon;
revoke all on function public.duplicate_hold_based_route(uuid,uuid,bigint) from public,anon;
grant execute on function public.save_hold_based_route(uuid,uuid,bigint,uuid,jsonb,uuid[]) to authenticated;
grant execute on function public.archive_hold_based_route(uuid,uuid,bigint) to authenticated;
grant execute on function public.duplicate_hold_based_route(uuid,uuid,bigint) to authenticated;

comment on table public.route_holds is 'Current many-to-many membership between routes and reusable physical holds.';
comment on table public.route_versions is 'Immutable route definition snapshots; one row for every route mutation.';
comment on table public.route_version_holds is 'Immutable physical hold snapshots for an exact route revision.';
