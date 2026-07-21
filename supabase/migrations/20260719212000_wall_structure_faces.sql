-- Phase 2: measured climbing faces attached to physical wall structures.

alter table public.wall_structures
  add column faces_revision bigint not null default 0 check (faces_revision >= 0);

alter table public.walls
  add column width_metres numeric(8,3),
  add column height_metres numeric(8,3),
  add column climbing_angle_degrees numeric(6,2);

alter table public.walls add constraint walls_width_check
  check (width_metres is null or width_metres between 0.1 and 200);
alter table public.walls add constraint walls_height_check
  check (height_metres is null or height_metres between 0.1 and 100);
alter table public.walls add constraint walls_climbing_angle_check
  check (climbing_angle_degrees is null or climbing_angle_degrees between -90 and 180);
alter table public.walls add constraint walls_face_measurements_check
  check (
    wall_structure_id is null
    or (width_metres is not null and height_metres is not null and climbing_angle_degrees is not null)
  ) not valid;

-- Legacy areas retain gym-scoped names. Structured faces only need to be unique
-- within their physical structure, allowing common names such as "North Face".
alter table public.walls drop constraint walls_gym_name_key;
create unique index walls_unstructured_gym_name_key
  on public.walls (gym_id, name)
  where wall_structure_id is null and archived_at is null;
create unique index walls_structure_name_key
  on public.walls (wall_structure_id, lower(name))
  where wall_structure_id is not null and archived_at is null;
create index walls_gym_structure_order_idx
  on public.walls (gym_id, wall_structure_id, sort_order, id)
  where wall_structure_id is not null and archived_at is null;

-- Structured face mutations use the audited owner RPC. Existing route managers
-- retain direct CRUD only for legacy unstructured wall/sector records.
drop policy walls_manage_staff on public.walls;
create policy walls_manage_staff on public.walls
for all to authenticated
using (wall_structure_id is null and private.has_gym_capability(gym_id, 'routes.manage'))
with check (wall_structure_id is null and private.has_gym_capability(gym_id, 'routes.manage'));

create or replace function public.prevent_archiving_structure_with_faces()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.archived_at is null and new.archived_at is not null and exists (
    select 1 from public.walls face
    where face.wall_structure_id = old.id
      and face.gym_id = old.gym_id
      and face.is_active
      and face.archived_at is null
  ) then
    raise exception 'Remove this structure''s climbing faces first' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger wall_structures_protect_faces
before update of archived_at on public.wall_structures
for each row execute function public.prevent_archiving_structure_with_faces();

create or replace function public.save_wall_structure_faces(
  target_gym_id uuid,
  target_structure_id uuid,
  expected_revision bigint,
  face_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.wall_structures;
  item jsonb;
  face_id uuid;
  face_count integer;
  next_revision bigint;
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise insufficient_privilege;
  end if;
  if jsonb_typeof(face_payload) <> 'array' then
    raise exception 'Invalid face payload' using errcode = '22023';
  end if;
  face_count := jsonb_array_length(face_payload);
  if face_count > 100 then
    raise exception 'A wall structure may contain at most 100 faces' using errcode = '22023';
  end if;

  select * into selected
  from public.wall_structures
  where id = target_structure_id
    and gym_id = target_gym_id
    and archived_at is null
  for update;
  if selected.id is null then
    raise exception 'Wall structure not found' using errcode = '22023';
  end if;
  if selected.faces_revision <> expected_revision then
    raise exception 'Climbing faces changed in another session' using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(face_payload) candidate
    group by lower(btrim(candidate->>'name'))
    having count(*) > 1
  ) then
    raise exception 'Face names must be unique within a wall structure' using errcode = '23505';
  end if;

  -- Never hide a face that already anchors route history. The owner must move or
  -- explicitly archive those routes before a future lifecycle operation.
  if exists (
    select 1
    from public.walls face
    where face.gym_id = target_gym_id
      and face.wall_structure_id = target_structure_id
      and face.archived_at is null
      and not exists (
        select 1 from jsonb_array_elements(face_payload) payload
        where (payload->>'id')::uuid = face.id
      )
      and exists (select 1 from public.routes route where route.wall_id = face.id and route.gym_id = target_gym_id)
  ) then
    raise exception 'A face with route history cannot be deleted' using errcode = '23503';
  end if;

  for item in select value from jsonb_array_elements(face_payload) loop
    face_id := (item->>'id')::uuid;
    if nullif(btrim(item->>'name'), '') is null
      or char_length(btrim(item->>'name')) > 100
      or (item->>'widthMetres')::numeric not between 0.1 and 200
      or (item->>'heightMetres')::numeric not between 0.1 and 100
      or (item->>'climbingAngleDegrees')::numeric not between -90 and 180
      or char_length(coalesce(item->>'notes', '')) > 1000
      or (item->>'sortOrder')::integer not between 0 and 99 then
      raise exception 'A climbing face contains invalid values' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.walls face
      where face.id = face_id
        and (face.gym_id <> target_gym_id or face.wall_structure_id is distinct from target_structure_id)
    ) then
      raise exception 'A face identifier belongs to another wall structure' using errcode = '42501';
    end if;

    insert into public.walls (
      id, gym_id, wall_structure_id, name, description, sort_order, is_active,
      width_metres, height_metres, climbing_angle_degrees, archived_at
    ) values (
      face_id, target_gym_id, target_structure_id, btrim(item->>'name'),
      nullif(btrim(coalesce(item->>'notes', '')), ''), (item->>'sortOrder')::integer, true,
      (item->>'widthMetres')::numeric, (item->>'heightMetres')::numeric,
      (item->>'climbingAngleDegrees')::numeric, null
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_active = true,
      width_metres = excluded.width_metres,
      height_metres = excluded.height_metres,
      climbing_angle_degrees = excluded.climbing_angle_degrees,
      archived_at = null;
  end loop;

  update public.walls face
  set is_active = false, archived_at = now()
  where face.gym_id = target_gym_id
    and face.wall_structure_id = target_structure_id
    and face.archived_at is null
    and not exists (
      select 1 from jsonb_array_elements(face_payload) payload
      where (payload->>'id')::uuid = face.id
    );

  next_revision := selected.faces_revision + 1;
  update public.wall_structures
  set faces_revision = next_revision
  where id = target_structure_id and gym_id = target_gym_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, auth.uid(), 'user', 'wall_structure.faces_saved',
    'wall_structure', target_structure_id,
    jsonb_build_object('revision', next_revision, 'face_count', face_count)
  );

  return jsonb_build_object('revision', next_revision, 'saved_at', now());
exception
  when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation then
    raise exception 'Invalid climbing face payload' using errcode = '22023';
end;
$$;

revoke all on function public.save_wall_structure_faces(uuid, uuid, bigint, jsonb) from public, anon;
grant execute on function public.save_wall_structure_faces(uuid, uuid, bigint, jsonb) to authenticated;

comment on column public.walls.wall_structure_id is
  'Physical wall structure containing this climbing face; null only for legacy unstructured wall/area records.';
comment on column public.walls.climbing_angle_degrees is
  'Angle from vertical: negative is slab, zero is vertical, positive is overhang, and 90 is horizontal roof.';
comment on function public.save_wall_structure_faces(uuid, uuid, bigint, jsonb) is
  'Owner-only transactional face create/update/reorder/archive with optimistic concurrency and route-history protection.';
