-- Production 3D wall-surface metadata. Existing metre-based floorplans, faces,
-- holds and route assignments remain canonical and backwards compatible.

alter table public.wall_structures
  add column base_elevation_metres numeric(7,3) not null default 0
    check (base_elevation_metres between -10 and 100);

alter table public.walls
  add column surface_kind text not null default 'rectangle'
    check (surface_kind in ('rectangle','triangle_left','triangle_right','quadrilateral','custom')),
  add column profile_preset text not null default 'vertical'
    check (profile_preset in ('vertical','slab','overhang','steep','roof','left_facet','right_facet','custom')),
  add column facing_direction smallint not null default 1
    check (facing_direction in (-1,1)),
  add column local_offset_u_metres numeric(8,3) not null default 0
    check (local_offset_u_metres between -200 and 200),
  add column local_offset_v_metres numeric(8,3) not null default 0
    check (local_offset_v_metres between -100 and 100),
  add column local_offset_depth_metres numeric(8,3) not null default 0
    check (local_offset_depth_metres between -100 and 100),
  add column material_colour text not null default '#e7e5e4'
    check (material_colour ~ '^#[0-9A-Fa-f]{6}$');

create table public.wall_face_vertices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  face_id uuid not null,
  vertex_order smallint not null check (vertex_order between 0 and 31),
  local_u_metres numeric(9,3) not null check (local_u_metres between -200 and 200),
  local_v_metres numeric(9,3) not null check (local_v_metres between -100 and 100),
  local_depth_metres numeric(9,3) not null default 0 check (local_depth_metres between -100 and 100),
  connection_key uuid,
  created_at timestamptz not null default now(),
  constraint wall_face_vertices_face_fkey foreign key (face_id, gym_id)
    references public.walls(id, gym_id) on delete cascade,
  constraint wall_face_vertices_face_order_key unique (face_id, vertex_order)
);

create index wall_face_vertices_gym_face_order_idx
  on public.wall_face_vertices (gym_id, face_id, vertex_order);
create index wall_face_vertices_connection_idx
  on public.wall_face_vertices (gym_id, connection_key)
  where connection_key is not null;

alter table public.wall_face_vertices enable row level security;
create policy wall_face_vertices_select_member on public.wall_face_vertices
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  and exists (
    select 1 from public.walls face
    where face.id = face_id and face.gym_id = gym_id
      and face.is_active and face.archived_at is null
  )
);
revoke insert, update, delete on public.wall_face_vertices from authenticated;
grant select on public.wall_face_vertices to authenticated;

create or replace function private.surface_polygon_is_simple(vertices jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  vertex_count integer;
  first_index integer;
  second_index integer;
  first_next integer;
  second_next integer;
  a jsonb;
  b jsonb;
  c jsonb;
  d jsonb;
  area numeric := 0;
  o1 numeric;
  o2 numeric;
  o3 numeric;
  o4 numeric;
begin
  if jsonb_typeof(vertices) <> 'array' then return false; end if;
  vertex_count := jsonb_array_length(vertices);
  if vertex_count < 3 or vertex_count > 32 then return false; end if;
  for first_index in 0..vertex_count - 1 loop
    a := vertices->first_index;
    b := vertices->((first_index + 1) % vertex_count);
    if jsonb_typeof(a->'u') <> 'number' or jsonb_typeof(a->'v') <> 'number'
      or jsonb_typeof(a->'depth') <> 'number' then return false; end if;
    if (a->>'u')::numeric not between -200 and 200
      or (a->>'v')::numeric not between -100 and 100
      or (a->>'depth')::numeric not between -100 and 100 then return false; end if;
    area := area + (a->>'u')::numeric * (b->>'v')::numeric - (b->>'u')::numeric * (a->>'v')::numeric;
  end loop;
  if abs(area) < 0.000001 then return false; end if;

  for first_index in 0..vertex_count - 1 loop
    first_next := (first_index + 1) % vertex_count;
    a := vertices->first_index; b := vertices->first_next;
    for second_index in first_index + 1..vertex_count - 1 loop
      second_next := (second_index + 1) % vertex_count;
      if first_index = second_index or first_next = second_index or second_next = first_index then continue; end if;
      c := vertices->second_index; d := vertices->second_next;
      o1 := ((b->>'v')::numeric-(a->>'v')::numeric)*((c->>'u')::numeric-(b->>'u')::numeric)-((b->>'u')::numeric-(a->>'u')::numeric)*((c->>'v')::numeric-(b->>'v')::numeric);
      o2 := ((b->>'v')::numeric-(a->>'v')::numeric)*((d->>'u')::numeric-(b->>'u')::numeric)-((b->>'u')::numeric-(a->>'u')::numeric)*((d->>'v')::numeric-(b->>'v')::numeric);
      o3 := ((d->>'v')::numeric-(c->>'v')::numeric)*((a->>'u')::numeric-(d->>'u')::numeric)-((d->>'u')::numeric-(c->>'u')::numeric)*((a->>'v')::numeric-(d->>'v')::numeric);
      o4 := ((d->>'v')::numeric-(c->>'v')::numeric)*((b->>'u')::numeric-(d->>'u')::numeric)-((d->>'u')::numeric-(c->>'u')::numeric)*((b->>'v')::numeric-(d->>'v')::numeric);
      if ((o1 > 0 and o2 < 0) or (o1 < 0 and o2 > 0))
        and ((o3 > 0 and o4 < 0) or (o3 < 0 and o4 > 0)) then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create or replace function private.surface_polygon_contains(vertices jsonb, target_u numeric, target_v numeric)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  vertex_count integer := jsonb_array_length(vertices);
  current_index integer;
  previous_index integer;
  current_vertex jsonb;
  previous_vertex jsonb;
  current_u numeric;
  current_v numeric;
  previous_u numeric;
  previous_v numeric;
  cross_value numeric;
  inside boolean := false;
begin
  previous_index := vertex_count - 1;
  for current_index in 0..vertex_count - 1 loop
    current_vertex := vertices->current_index;
    previous_vertex := vertices->previous_index;
    current_u := (current_vertex->>'u')::numeric; current_v := (current_vertex->>'v')::numeric;
    previous_u := (previous_vertex->>'u')::numeric; previous_v := (previous_vertex->>'v')::numeric;
    cross_value := (target_v-current_v)*(previous_u-current_u)-(target_u-current_u)*(previous_v-current_v);
    if abs(cross_value) < 0.000001 and target_u between least(current_u,previous_u) and greatest(current_u,previous_u)
      and target_v between least(current_v,previous_v) and greatest(current_v,previous_v) then return true; end if;
    if ((current_v > target_v) <> (previous_v > target_v))
      and target_u < (previous_u-current_u)*(target_v-current_v)/(previous_v-current_v)+current_u then inside := not inside; end if;
    previous_index := current_index;
  end loop;
  return inside;
exception when others then return false;
end;
$$;

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
  vertex jsonb;
  selected_face_id uuid;
  face_count integer;
  next_revision bigint;
  selected_surface_kind text;
  selected_vertices jsonb;
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then raise insufficient_privilege; end if;
  if jsonb_typeof(face_payload) <> 'array' then raise exception 'Invalid face payload' using errcode = '22023'; end if;
  face_count := jsonb_array_length(face_payload);
  if face_count > 100 then raise exception 'A wall structure may contain at most 100 faces' using errcode = '22023'; end if;

  select * into selected from public.wall_structures
  where id = target_structure_id and gym_id = target_gym_id and archived_at is null for update;
  if selected.id is null then raise exception 'Wall structure not found' using errcode = '22023'; end if;
  if selected.faces_revision <> expected_revision then raise exception 'Climbing faces changed in another session' using errcode = '40001'; end if;
  if exists (select 1 from jsonb_array_elements(face_payload) candidate group by lower(btrim(candidate->>'name')) having count(*) > 1)
    then raise exception 'Face names must be unique within a wall structure' using errcode = '23505'; end if;

  if exists (
    select 1 from public.walls face
    where face.gym_id = target_gym_id and face.wall_structure_id = target_structure_id and face.archived_at is null
      and not exists (select 1 from jsonb_array_elements(face_payload) payload where (payload->>'id')::uuid = face.id)
      and exists (select 1 from public.routes route where route.wall_id = face.id and route.gym_id = target_gym_id)
  ) then raise exception 'A face with route history cannot be deleted' using errcode = '23503'; end if;

  for item in select value from jsonb_array_elements(face_payload) loop
    selected_face_id := (item->>'id')::uuid;
    selected_surface_kind := coalesce(item->>'surfaceKind', 'rectangle');
    selected_vertices := coalesce(item->'vertices', '[]'::jsonb);
    if nullif(btrim(item->>'name'), '') is null or char_length(btrim(item->>'name')) > 100
      or (item->>'widthMetres')::numeric not between 0.1 and 200
      or (item->>'heightMetres')::numeric not between 0.1 and 100
      or (item->>'climbingAngleDegrees')::numeric not between -90 and 180
      or char_length(coalesce(item->>'notes', '')) > 1000
      or (item->>'sortOrder')::integer not between 0 and 99
      or selected_surface_kind not in ('rectangle','triangle_left','triangle_right','quadrilateral','custom')
      or coalesce(item->>'profile', 'vertical') not in ('vertical','slab','overhang','steep','roof','left_facet','right_facet','custom')
      or coalesce((item->>'facingDirection')::integer, 1) not in (-1,1)
      or coalesce((item->>'localOffsetU')::numeric, 0) not between -200 and 200
      or coalesce((item->>'localOffsetV')::numeric, 0) not between -100 and 100
      or coalesce((item->>'localOffsetDepth')::numeric, 0) not between -100 and 100
      or coalesce(item->>'materialColour', '#e7e5e4') !~ '^#[0-9A-Fa-f]{6}$'
      or (selected_surface_kind = 'custom' and not private.surface_polygon_is_simple(selected_vertices))
    then raise exception 'A climbing face contains invalid values' using errcode = '22023'; end if;
    if selected_surface_kind = 'custom' and exists (
      select 1 from public.wall_holds hold where hold.gym_id=target_gym_id and hold.wall_id=selected_face_id
        and hold.archived_at is null and not private.surface_polygon_contains(selected_vertices,hold.position_x_metres,hold.position_y_metres)
    ) then raise exception 'Custom surface cannot exclude installed holds' using errcode = 'P0001'; end if;
    if exists (select 1 from public.walls face where face.id = selected_face_id and (face.gym_id <> target_gym_id or face.wall_structure_id is distinct from target_structure_id))
      then raise exception 'A face identifier belongs to another wall structure' using errcode = '42501'; end if;

    insert into public.walls (
      id,gym_id,wall_structure_id,name,description,sort_order,is_active,width_metres,height_metres,
      climbing_angle_degrees,surface_kind,profile_preset,facing_direction,local_offset_u_metres,
      local_offset_v_metres,local_offset_depth_metres,material_colour,archived_at
    ) values (
      selected_face_id,target_gym_id,target_structure_id,btrim(item->>'name'),nullif(btrim(coalesce(item->>'notes','')),''),
      (item->>'sortOrder')::integer,true,(item->>'widthMetres')::numeric,(item->>'heightMetres')::numeric,
      (item->>'climbingAngleDegrees')::numeric,selected_surface_kind,coalesce(item->>'profile','vertical'),
      coalesce((item->>'facingDirection')::integer,1),coalesce((item->>'localOffsetU')::numeric,0),
      coalesce((item->>'localOffsetV')::numeric,0),coalesce((item->>'localOffsetDepth')::numeric,0),
      coalesce(item->>'materialColour','#e7e5e4'),null
    ) on conflict (id) do update set
      name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,is_active=true,
      width_metres=excluded.width_metres,height_metres=excluded.height_metres,climbing_angle_degrees=excluded.climbing_angle_degrees,
      surface_kind=excluded.surface_kind,profile_preset=excluded.profile_preset,facing_direction=excluded.facing_direction,
      local_offset_u_metres=excluded.local_offset_u_metres,local_offset_v_metres=excluded.local_offset_v_metres,
      local_offset_depth_metres=excluded.local_offset_depth_metres,material_colour=excluded.material_colour,archived_at=null;

    delete from public.wall_face_vertices vertex_row where vertex_row.gym_id = target_gym_id and vertex_row.face_id = selected_face_id;
    if selected_surface_kind = 'custom' then
      for vertex in select value from jsonb_array_elements(selected_vertices) loop
        insert into public.wall_face_vertices (gym_id,face_id,vertex_order,local_u_metres,local_v_metres,local_depth_metres,connection_key)
        values (target_gym_id,selected_face_id,(vertex->>'order')::smallint,(vertex->>'u')::numeric,(vertex->>'v')::numeric,(vertex->>'depth')::numeric,nullif(vertex->>'connectionKey','')::uuid);
      end loop;
    end if;
  end loop;

  update public.walls face set is_active=false,archived_at=now()
  where face.gym_id=target_gym_id and face.wall_structure_id=target_structure_id and face.archived_at is null
    and not exists (select 1 from jsonb_array_elements(face_payload) payload where (payload->>'id')::uuid=face.id);
  next_revision := selected.faces_revision + 1;
  update public.wall_structures set faces_revision=next_revision where id=target_structure_id and gym_id=target_gym_id;
  insert into public.audit_logs (gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values (target_gym_id,auth.uid(),'user','wall_structure.faces_saved','wall_structure',target_structure_id,jsonb_build_object('revision',next_revision,'face_count',face_count,'geometry','3d'));
  return jsonb_build_object('revision',next_revision,'saved_at',now());
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation
  then raise exception 'Invalid climbing face payload' using errcode = '22023';
end;
$$;

revoke all on function public.save_wall_structure_faces(uuid,uuid,bigint,jsonb) from public, anon;
grant execute on function public.save_wall_structure_faces(uuid,uuid,bigint,jsonb) to authenticated;

comment on table public.wall_face_vertices is
  'Ordered face-local metre vertices for custom climbing surfaces. connection_key can identify intentionally shared panel edges.';
comment on column public.walls.facing_direction is
  'Selects either normal of the parent floorplan segment without duplicating the wall structure.';
comment on column public.walls.profile_preset is
  'Constrained staff-facing 3D profile preset; climbing_angle_degrees remains the canonical incline.';
