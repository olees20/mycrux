-- Hold Library: reusable wall-local hold objects, independent from routes.

alter table public.walls
  add column holds_revision bigint not null default 0 check (holds_revision >= 0);

create table public.wall_holds (
  id uuid primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  wall_id uuid not null,
  category text not null check (category in (
    'jug','crimp','sloper','pinch','pocket','edge','volume','macro','dual_texture','foothold'
  )),
  icon_key text not null check (icon_key in (
    'jug','crimp','sloper','pinch','pocket','edge','volume','macro','dual_texture','foothold'
  )),
  position_x_metres numeric(10,3) not null,
  position_y_metres numeric(10,3) not null,
  rotation_degrees numeric(7,3) not null default 0 check (rotation_degrees >= 0 and rotation_degrees < 360),
  scale_factor numeric(6,3) not null default 1 check (scale_factor between 0.1 and 10),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 16384
  ),
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wall_holds_wall_fkey
    foreign key (wall_id, gym_id) references public.walls(id, gym_id) on delete cascade,
  constraint wall_holds_id_gym_key unique (id, gym_id)
);

create index wall_holds_gym_wall_active_idx
  on public.wall_holds (gym_id, wall_id, created_at, id)
  where archived_at is null;

create trigger wall_holds_set_updated_at
before update on public.wall_holds
for each row execute function public.set_updated_at();

alter table public.wall_holds enable row level security;
create policy wall_holds_select_member on public.wall_holds
for select to authenticated
using (private.current_membership_id(gym_id) is not null and archived_at is null);
revoke insert, update, delete on public.wall_holds from authenticated;
grant select on public.wall_holds to authenticated;

create or replace function public.protect_face_hold_coordinates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.wall_structure_id is not null and exists (
    select 1 from public.wall_holds hold
    where hold.wall_id = old.id
      and hold.gym_id = old.gym_id
      and hold.archived_at is null
      and (
        new.archived_at is not null
        or not new.is_active
        or hold.position_x_metres > new.width_metres
        or hold.position_y_metres > new.height_metres
      )
  ) then
    raise exception 'Remove or reposition this face''s holds first' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger walls_protect_hold_coordinates
before update of width_metres, height_metres, is_active, archived_at on public.walls
for each row execute function public.protect_face_hold_coordinates();

create or replace function public.save_wall_holds(
  target_gym_id uuid,
  target_face_id uuid,
  expected_revision bigint,
  hold_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.walls;
  item jsonb;
  hold_id uuid;
  hold_count integer;
  next_revision bigint;
  allowed_categories constant text[] := array[
    'jug','crimp','sloper','pinch','pocket','edge','volume','macro','dual_texture','foothold'
  ];
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise insufficient_privilege;
  end if;
  if jsonb_typeof(hold_payload) <> 'array' then
    raise exception 'Invalid hold payload' using errcode = '22023';
  end if;
  hold_count := jsonb_array_length(hold_payload);
  if hold_count > 10000 then
    raise exception 'A wall face may contain at most 10000 holds' using errcode = '22023';
  end if;
  if hold_count <> (
    select count(distinct value->>'id')
    from jsonb_array_elements(hold_payload)
  ) then
    raise exception 'Hold identifiers must be unique' using errcode = '22023';
  end if;

  select * into selected
  from public.walls
  where id = target_face_id
    and gym_id = target_gym_id
    and wall_structure_id is not null
    and width_metres is not null
    and height_metres is not null
    and is_active
    and archived_at is null
  for update;
  if selected.id is null then
    raise exception 'Climbing face not found' using errcode = '22023';
  end if;
  if selected.holds_revision <> expected_revision then
    raise exception 'Wall holds changed in another session' using errcode = '40001';
  end if;

  for item in select value from jsonb_array_elements(hold_payload) loop
    hold_id := (item->>'id')::uuid;
    if coalesce(not (item->>'category' = any(allowed_categories)), true)
      or coalesce(not (item->>'iconKey' = any(allowed_categories)), true)
      or jsonb_typeof(item->'positionXMetres') <> 'number'
      or jsonb_typeof(item->'positionYMetres') <> 'number'
      or jsonb_typeof(item->'rotationDegrees') <> 'number'
      or jsonb_typeof(item->'scaleFactor') <> 'number'
      or (item->>'positionXMetres')::numeric not between 0 and selected.width_metres
      or (item->>'positionYMetres')::numeric not between 0 and selected.height_metres
      or (item->>'rotationDegrees')::numeric < 0
      or (item->>'rotationDegrees')::numeric >= 360
      or (item->>'scaleFactor')::numeric not between 0.1 and 10
      or jsonb_typeof(item->'metadata') <> 'object'
      or octet_length((item->'metadata')::text) > 16384 then
      raise exception 'A hold contains invalid values' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.wall_holds hold
      where hold.id = hold_id
        and (hold.gym_id <> target_gym_id or hold.wall_id <> target_face_id)
    ) then
      raise exception 'A hold identifier belongs to another wall face' using errcode = '42501';
    end if;

    insert into public.wall_holds (
      id, gym_id, wall_id, category, icon_key,
      position_x_metres, position_y_metres, rotation_degrees, scale_factor,
      metadata, archived_at, created_by
    ) values (
      hold_id, target_gym_id, target_face_id, item->>'category', item->>'iconKey',
      (item->>'positionXMetres')::numeric, (item->>'positionYMetres')::numeric,
      (item->>'rotationDegrees')::numeric, (item->>'scaleFactor')::numeric,
      item->'metadata', null, auth.uid()
    )
    on conflict (id) do update set
      category = excluded.category,
      icon_key = excluded.icon_key,
      position_x_metres = excluded.position_x_metres,
      position_y_metres = excluded.position_y_metres,
      rotation_degrees = excluded.rotation_degrees,
      scale_factor = excluded.scale_factor,
      metadata = excluded.metadata,
      archived_at = null;
  end loop;

  update public.wall_holds hold
  set archived_at = now()
  where hold.gym_id = target_gym_id
    and hold.wall_id = target_face_id
    and hold.archived_at is null
    and not exists (
      select 1 from jsonb_array_elements(hold_payload) payload
      where (payload->>'id')::uuid = hold.id
    );

  next_revision := selected.holds_revision + 1;
  update public.walls set holds_revision = next_revision
  where id = target_face_id and gym_id = target_gym_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, auth.uid(), 'user', 'wall_holds.saved', 'wall_face', target_face_id,
    jsonb_build_object('revision', next_revision, 'hold_count', hold_count)
  );

  return jsonb_build_object('revision', next_revision, 'saved_at', now());
exception
  when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or cardinality_violation then
    raise exception 'Invalid hold payload' using errcode = '22023';
end;
$$;

revoke all on function public.save_wall_holds(uuid, uuid, bigint, jsonb) from public, anon;
grant execute on function public.save_wall_holds(uuid, uuid, bigint, jsonb) to authenticated;

comment on table public.wall_holds is
  'Reusable physical hold/volume objects positioned on a measured face; intentionally independent from routes.';
comment on column public.wall_holds.icon_key is
  'Safe application-owned SVG vocabulary key. Raw executable SVG markup is never stored or rendered.';
comment on function public.save_wall_holds(uuid, uuid, bigint, jsonb) is
  'Owner-only transactional full-document hold save with optimistic concurrency and audit logging.';
