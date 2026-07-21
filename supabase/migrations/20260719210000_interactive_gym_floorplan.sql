-- Phase 1: metre-based gym floorplans and physical wall structures.

create table public.gym_floorplans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms(id) on delete cascade,
  name text not null default 'Main floorplan' check (char_length(name) between 1 and 100),
  width_metres numeric(8,3) not null default 60 check (width_metres between 5 and 1000),
  height_metres numeric(8,3) not null default 40 check (height_metres between 5 and 1000),
  grid_size_metres numeric(6,3) not null default 1 check (grid_size_metres between 0.1 and 10),
  show_grid boolean not null default true,
  snap_to_grid boolean not null default true,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_floorplans_id_gym_key unique (id, gym_id)
);

create trigger gym_floorplans_set_updated_at
before update on public.gym_floorplans
for each row execute function public.set_updated_at();

create table public.wall_structures (
  id uuid primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  floorplan_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  start_x_metres numeric(10,3) not null,
  start_y_metres numeric(10,3) not null,
  end_x_metres numeric(10,3) not null,
  end_y_metres numeric(10,3) not null,
  thickness_metres numeric(5,3) not null default 0.2 check (thickness_metres between 0.05 and 2),
  length_metres numeric(10,3) generated always as (
    round(sqrt(
      power(end_x_metres - start_x_metres, 2) +
      power(end_y_metres - start_y_metres, 2)
    ), 3)
  ) stored,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wall_structures_floorplan_fkey
    foreign key (floorplan_id, gym_id) references public.gym_floorplans(id, gym_id) on delete cascade,
  constraint wall_structures_id_gym_key unique (id, gym_id),
  constraint wall_structures_nonzero_length_check check (
    power(end_x_metres - start_x_metres, 2) +
    power(end_y_metres - start_y_metres, 2) >= 0.0025
  )
);

create index wall_structures_gym_floorplan_active_idx
on public.wall_structures (gym_id, floorplan_id, created_at, id)
where archived_at is null;

create trigger wall_structures_set_updated_at
before update on public.wall_structures
for each row execute function public.set_updated_at();

-- Existing walls remain climbing faces/areas. This nullable relationship is the
-- stable boundary for a later face-modelling phase; no face is created here.
alter table public.walls add column wall_structure_id uuid;
alter table public.walls add constraint walls_structure_fkey
  foreign key (wall_structure_id, gym_id)
  references public.wall_structures(id, gym_id) on delete restrict;
create index walls_structure_idx on public.walls (wall_structure_id)
where wall_structure_id is not null;

alter table public.gym_floorplans enable row level security;
alter table public.wall_structures enable row level security;

create policy gym_floorplans_select_member on public.gym_floorplans
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

create policy wall_structures_select_member on public.wall_structures
for select to authenticated
using (private.current_membership_id(gym_id) is not null and archived_at is null);

revoke insert, update, delete on public.gym_floorplans from authenticated;
revoke insert, update, delete on public.wall_structures from authenticated;
grant select on public.gym_floorplans, public.wall_structures to authenticated;

create or replace function public.ensure_gym_floorplan(target_gym_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise insufficient_privilege;
  end if;

  insert into public.gym_floorplans (gym_id)
  values (target_gym_id)
  on conflict (gym_id) do update set gym_id = excluded.gym_id
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.save_gym_floorplan(
  target_gym_id uuid,
  target_floorplan_id uuid,
  expected_revision bigint,
  floorplan_configuration jsonb,
  wall_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.gym_floorplans;
  item jsonb;
  wall_id uuid;
  wall_count integer;
  next_revision bigint;
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise insufficient_privilege;
  end if;
  if jsonb_typeof(floorplan_configuration) <> 'object'
    or jsonb_typeof(wall_payload) <> 'array' then
    raise exception 'Invalid floorplan payload' using errcode = '22023';
  end if;

  wall_count := jsonb_array_length(wall_payload);
  if wall_count > 5000 then
    raise exception 'A floorplan may contain at most 5000 walls' using errcode = '22023';
  end if;

  select * into selected
  from public.gym_floorplans
  where id = target_floorplan_id and gym_id = target_gym_id
  for update;
  if selected.id is null then
    raise exception 'Floorplan not found' using errcode = '22023';
  end if;
  if selected.revision <> expected_revision then
    raise exception 'Floorplan changed in another session' using errcode = '40001';
  end if;

  selected.width_metres := (floorplan_configuration->>'widthMetres')::numeric;
  selected.height_metres := (floorplan_configuration->>'heightMetres')::numeric;
  selected.grid_size_metres := (floorplan_configuration->>'gridSizeMetres')::numeric;
  if selected.width_metres not between 5 and 1000
    or selected.height_metres not between 5 and 1000
    or selected.grid_size_metres not between 0.1 and 10 then
    raise exception 'Floorplan dimensions are out of range' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(wall_payload) loop
    wall_id := (item->>'id')::uuid;
    if nullif(btrim(item->>'name'), '') is null
      or char_length(btrim(item->>'name')) > 100
      or (item->>'startXMetres')::numeric not between 0 and selected.width_metres
      or (item->>'endXMetres')::numeric not between 0 and selected.width_metres
      or (item->>'startYMetres')::numeric not between 0 and selected.height_metres
      or (item->>'endYMetres')::numeric not between 0 and selected.height_metres
      or (item->>'thicknessMetres')::numeric not between 0.05 and 2 then
      raise exception 'A wall contains invalid values' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.wall_structures structure
      where structure.id = wall_id
        and (structure.gym_id <> target_gym_id or structure.floorplan_id <> target_floorplan_id)
    ) then
      raise exception 'A wall identifier belongs to another floorplan' using errcode = '42501';
    end if;

    insert into public.wall_structures (
      id, gym_id, floorplan_id, name,
      start_x_metres, start_y_metres, end_x_metres, end_y_metres,
      thickness_metres, archived_at, created_at
    ) values (
      wall_id, target_gym_id, target_floorplan_id, btrim(item->>'name'),
      (item->>'startXMetres')::numeric, (item->>'startYMetres')::numeric,
      (item->>'endXMetres')::numeric, (item->>'endYMetres')::numeric,
      (item->>'thicknessMetres')::numeric, null, now()
    )
    on conflict (id) do update set
      name = excluded.name,
      start_x_metres = excluded.start_x_metres,
      start_y_metres = excluded.start_y_metres,
      end_x_metres = excluded.end_x_metres,
      end_y_metres = excluded.end_y_metres,
      thickness_metres = excluded.thickness_metres,
      archived_at = null;
  end loop;

  update public.wall_structures structure
  set archived_at = now()
  where structure.gym_id = target_gym_id
    and structure.floorplan_id = target_floorplan_id
    and structure.archived_at is null
    and not exists (
      select 1 from jsonb_array_elements(wall_payload) payload
      where (payload->>'id')::uuid = structure.id
    );

  next_revision := selected.revision + 1;
  update public.gym_floorplans set
    width_metres = selected.width_metres,
    height_metres = selected.height_metres,
    grid_size_metres = selected.grid_size_metres,
    show_grid = coalesce((floorplan_configuration->>'showGrid')::boolean, true),
    snap_to_grid = coalesce((floorplan_configuration->>'snapToGrid')::boolean, true),
    revision = next_revision
  where id = target_floorplan_id and gym_id = target_gym_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, auth.uid(), 'user', 'floorplan.saved', 'gym_floorplan',
    target_floorplan_id, jsonb_build_object('revision', next_revision, 'wall_count', wall_count)
  );

  return jsonb_build_object('revision', next_revision, 'saved_at', now());
exception
  when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation then
    raise exception 'Invalid floorplan payload' using errcode = '22023';
end;
$$;

revoke all on function public.ensure_gym_floorplan(uuid) from public, anon;
revoke all on function public.save_gym_floorplan(uuid, uuid, bigint, jsonb, jsonb) from public, anon;
grant execute on function public.ensure_gym_floorplan(uuid) to authenticated;
grant execute on function public.save_gym_floorplan(uuid, uuid, bigint, jsonb, jsonb) to authenticated;

comment on table public.gym_floorplans is
  'Metre-coordinate navigation canvases. One canonical floorplan is currently supported per gym.';
comment on table public.wall_structures is
  'Physical wall segments drawn on a floorplan. Climbing faces attach here in a later phase.';
comment on column public.wall_structures.length_metres is
  'Database-generated Euclidean length rounded to the persisted coordinate precision.';
comment on function public.save_gym_floorplan(uuid, uuid, bigint, jsonb, jsonb) is
  'Owner-only transactional full-document save with validation and optimistic concurrency.';
