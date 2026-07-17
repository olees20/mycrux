-- Prompt 12: secure wall imagery, normalised route overlays, and route workflows.

create or replace function private.valid_route_overlay(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  point jsonb;
  coordinate numeric;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' then return false; end if;

  if value->>'kind' = 'point' then
    if not (value ? 'x' and value ? 'y') then return false; end if;
    begin
      return (value->>'x')::numeric between 0 and 1
        and (value->>'y')::numeric between 0 and 1;
    exception when others then return false;
    end;
  end if;

  if value->>'kind' = 'polygon' then
    if jsonb_typeof(value->'points') <> 'array'
      or jsonb_array_length(value->'points') not between 3 and 100 then
      return false;
    end if;
    for point in select * from jsonb_array_elements(value->'points') loop
      if jsonb_typeof(point) <> 'object' or not (point ? 'x' and point ? 'y') then return false; end if;
      begin
        coordinate := (point->>'x')::numeric;
        if coordinate < 0 or coordinate > 1 then return false; end if;
        coordinate := (point->>'y')::numeric;
        if coordinate < 0 or coordinate > 1 then return false; end if;
      exception when others then return false;
      end;
    end loop;
    return true;
  end if;

  return false;
end;
$$;

alter table public.routes drop constraint routes_overlay_check;
alter table public.routes add constraint routes_overlay_check
  check (private.valid_route_overlay(overlay));

create or replace function public.attach_wall_image(
  target_gym_id uuid,
  target_wall_id uuid,
  object_path text,
  image_alt_text text,
  image_width integer,
  image_height integer,
  image_captured_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_image_id uuid;
  next_version integer;
begin
  if not private.has_gym_capability(target_gym_id, 'routes.manage') then
    raise exception 'Route management access is required' using errcode = '42501';
  end if;
  perform 1 from public.walls where id = target_wall_id and gym_id = target_gym_id and archived_at is null for update;
  if not found then raise exception 'Wall was not found' using errcode = '22023'; end if;
  if object_path !~ ('^' || target_gym_id::text || '/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$') then
    raise exception 'Wall image path is invalid' using errcode = '22023';
  end if;
  if not exists(select 1 from storage.objects where bucket_id = 'wall-images' and name = object_path) then
    raise exception 'Uploaded wall image does not exist' using errcode = '22023';
  end if;
  if char_length(trim(image_alt_text)) not between 1 and 500 or image_width <= 0 or image_height <= 0 then
    raise exception 'Wall image details are invalid' using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.wall_images where wall_id = target_wall_id;
  update public.wall_images set is_current = false, archived_at = coalesce(archived_at, now())
  where wall_id = target_wall_id and is_current and archived_at is null;
  insert into public.wall_images(gym_id, wall_id, storage_path, alt_text, width, height, captured_at, version)
  values(target_gym_id, target_wall_id, object_path, trim(image_alt_text), image_width, image_height, image_captured_at, next_version)
  returning id into new_image_id;
  insert into public.audit_logs(gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values(target_gym_id, auth.uid(), 'user', 'wall.image.attached', 'wall_image', new_image_id,
    jsonb_build_object('wall_id', target_wall_id, 'version', next_version));
  return new_image_id;
end;
$$;

create or replace function public.publish_routes(target_gym_id uuid, target_route_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.has_gym_capability(target_gym_id, 'routes.manage') then
    raise exception 'Route management access is required' using errcode = '42501';
  end if;
  update public.routes
  set status = 'published', published_at = coalesce(published_at, now()), retired_at = null, archived_at = null
  where gym_id = target_gym_id and id = any(target_route_ids) and status in ('draft', 'retired');
  get diagnostics affected = row_count;
  insert into public.audit_logs(gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values(target_gym_id, auth.uid(), 'user', 'routes.published', 'gym', target_gym_id,
    jsonb_build_object('route_ids', to_jsonb(target_route_ids), 'count', affected));
  return affected;
end;
$$;

create or replace function public.retire_routes(target_gym_id uuid, target_route_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.has_gym_capability(target_gym_id, 'routes.manage') then
    raise exception 'Route management access is required' using errcode = '42501';
  end if;
  -- Routes are retained so ascents, favourites, feedback, and historical wall maps remain valid.
  update public.routes
  set status = 'retired', retired_at = coalesce(retired_at, now())
  where gym_id = target_gym_id and id = any(target_route_ids) and status <> 'archived';
  get diagnostics affected = row_count;
  insert into public.audit_logs(gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values(target_gym_id, auth.uid(), 'user', 'routes.retired', 'gym', target_gym_id,
    jsonb_build_object('route_ids', to_jsonb(target_route_ids), 'count', affected));
  return affected;
end;
$$;

create or replace function public.attach_route_media(
  target_gym_id uuid,
  target_route_id uuid,
  object_path text,
  object_media_type text,
  object_alt_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_media_id uuid;
begin
  if not private.has_gym_capability(target_gym_id, 'routes.manage') then
    raise exception 'Route management access is required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.routes where id = target_route_id and gym_id = target_gym_id) then
    raise exception 'Route was not found' using errcode = '22023';
  end if;
  if object_media_type <> 'image'
    or object_path !~ ('^' || target_gym_id::text || '/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$') then
    raise exception 'Route media is invalid' using errcode = '22023';
  end if;
  if not exists(select 1 from storage.objects where bucket_id = 'route-media' and name = object_path) then
    raise exception 'Uploaded route media does not exist' using errcode = '22023';
  end if;
  insert into public.route_media(gym_id, route_id, uploaded_by, media_type, storage_path, alt_text, processing_status)
  values(target_gym_id, target_route_id, auth.uid(), object_media_type, object_path, nullif(trim(object_alt_text), ''), 'ready')
  returning id into new_media_id;
  return new_media_id;
end;
$$;

-- Route removal is always a state transition. No authenticated role may destroy history.
drop policy routes_manage_staff on public.routes;
create policy routes_select_manage_staff on public.routes for select to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'));
create policy routes_insert_manage_staff on public.routes for insert to authenticated
with check (private.has_gym_capability(gym_id, 'routes.manage'));
create policy routes_update_manage_staff on public.routes for update to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

revoke delete on public.routes from authenticated;
revoke all on function public.attach_wall_image(uuid,uuid,text,text,integer,integer,timestamptz) from public, anon;
revoke all on function public.publish_routes(uuid,uuid[]) from public, anon;
revoke all on function public.retire_routes(uuid,uuid[]) from public, anon;
revoke all on function public.attach_route_media(uuid,uuid,text,text,text) from public, anon;
grant execute on function public.attach_wall_image(uuid,uuid,text,text,integer,integer,timestamptz) to authenticated, service_role;
grant execute on function public.publish_routes(uuid,uuid[]) to authenticated, service_role;
grant execute on function public.retire_routes(uuid,uuid[]) to authenticated, service_role;
grant execute on function public.attach_route_media(uuid,uuid,text,text,text) to authenticated, service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('wall-images', 'wall-images', false, 10485760, array['image/png','image/jpeg','image/webp']),
  ('route-media', 'route-media', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy wall_image_objects_select on storage.objects for select to authenticated
using(bucket_id = 'wall-images' and private.current_membership_id((storage.foldername(name))[1]::uuid) is not null);
create policy wall_image_objects_insert on storage.objects for insert to authenticated
with check(bucket_id = 'wall-images' and private.has_gym_capability((storage.foldername(name))[1]::uuid, 'routes.manage'));
create policy wall_image_objects_delete on storage.objects for delete to authenticated
using(bucket_id = 'wall-images' and private.has_gym_capability((storage.foldername(name))[1]::uuid, 'routes.manage'));
create policy route_media_objects_select on storage.objects for select to authenticated
using(bucket_id = 'route-media' and private.current_membership_id((storage.foldername(name))[1]::uuid) is not null);
create policy route_media_objects_insert on storage.objects for insert to authenticated
with check(bucket_id = 'route-media' and private.has_gym_capability((storage.foldername(name))[1]::uuid, 'routes.manage'));
create policy route_media_objects_delete on storage.objects for delete to authenticated
using(bucket_id = 'route-media' and private.has_gym_capability((storage.foldername(name))[1]::uuid, 'routes.manage'));
