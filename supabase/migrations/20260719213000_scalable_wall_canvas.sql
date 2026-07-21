-- Phase 3: permanent metre-coordinate canvas configuration for each climbing face.

alter table public.walls
  add column canvas_grid_size_metres numeric(6,3) not null default 0.25,
  add column canvas_show_grid boolean not null default true,
  add column canvas_snap_to_grid boolean not null default true,
  add column canvas_revision bigint not null default 0;

alter table public.walls add constraint walls_canvas_grid_size_check
  check (canvas_grid_size_metres between 0.05 and 5);
alter table public.walls add constraint walls_canvas_revision_check
  check (canvas_revision >= 0);

create or replace function public.save_wall_canvas_settings(
  target_gym_id uuid,
  target_face_id uuid,
  expected_revision bigint,
  grid_size_metres numeric,
  show_grid boolean,
  snap_to_grid boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.walls;
  next_revision bigint;
begin
  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise insufficient_privilege;
  end if;
  if grid_size_metres not between 0.05 and 5 then
    raise exception 'Canvas grid size is out of range' using errcode = '22023';
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
  if selected.canvas_revision <> expected_revision then
    raise exception 'Wall canvas changed in another session' using errcode = '40001';
  end if;

  next_revision := selected.canvas_revision + 1;
  update public.walls set
    canvas_grid_size_metres = grid_size_metres,
    canvas_show_grid = show_grid,
    canvas_snap_to_grid = snap_to_grid,
    canvas_revision = next_revision
  where id = target_face_id and gym_id = target_gym_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, auth.uid(), 'user', 'wall_canvas.settings_saved',
    'wall_face', target_face_id,
    jsonb_build_object('revision', next_revision, 'grid_size_metres', grid_size_metres)
  );

  return jsonb_build_object('revision', next_revision, 'saved_at', now());
end;
$$;

revoke all on function public.save_wall_canvas_settings(uuid, uuid, bigint, numeric, boolean, boolean) from public, anon;
grant execute on function public.save_wall_canvas_settings(uuid, uuid, bigint, numeric, boolean, boolean) to authenticated;

comment on column public.walls.canvas_grid_size_metres is
  'Permanent wall-editor snapping interval in metres. Canvas coordinates use a bottom-left origin.';
comment on function public.save_wall_canvas_settings(uuid, uuid, bigint, numeric, boolean, boolean) is
  'Owner-only optimistic save for a measured climbing face canvas configuration.';
