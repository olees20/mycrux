-- Wall canvases derive scale from measured faces and persist owner-only settings.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000074','00000000-0000-0000-0000-000000000000','authenticated','authenticated','canvas-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Canvas Owner"}'),
  ('10000000-0000-4000-8000-000000000075','00000000-0000-0000-0000-000000000000','authenticated','authenticated','canvas-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Canvas Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000074',true);

do $$
declare
  local_gym_id uuid;
  floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000074';
  face_id constant uuid := '30000000-0000-4000-8000-000000000074';
  legacy_id uuid;
  result jsonb;
begin
  local_gym_id := public.create_my_first_gym('{"name":"Canvas Test Gym","slug":"canvas-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(local_gym_id);
  perform public.save_gym_floorplan(local_gym_id,floorplan_id,0,'{"widthMetres":30,"heightMetres":20,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Canvas Block','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-19T12:00:00Z')));
  perform public.save_wall_structure_faces(local_gym_id,structure_id,0,jsonb_build_array(jsonb_build_object('id',face_id,'name','Canvas Face','widthMetres',8,'heightMetres',4.5,'climbingAngleDegrees',15,'notes','','sortOrder',0)));
  insert into public.walls(gym_id,name) values(local_gym_id,'Legacy Canvas Area') returning id into legacy_id;

  result := public.save_wall_canvas_settings(local_gym_id,face_id,0,0.1,true,true);
  perform set_config('test.canvas_gym',local_gym_id::text,true);
  perform set_config('test.canvas_face',face_id::text,true);
  perform set_config('test.canvas_legacy',legacy_id::text,true);
  if (result->>'revision')::bigint <> 1 then raise exception 'Canvas revision did not advance'; end if;
  if (select canvas_grid_size_metres from public.walls where id=face_id) <> 0.100 then raise exception 'Canvas grid was not stored'; end if;
  if (select width_metres from public.walls where id=face_id) <> 8.000 or (select height_metres from public.walls where id=face_id) <> 4.500 then raise exception 'Canvas scale no longer matches face measurements'; end if;
  if not exists(select 1 from public.audit_logs log where log.gym_id=local_gym_id and log.action='wall_canvas.settings_saved') then raise exception 'Canvas save was not audited'; end if;
end;
$$;

do $$
begin
  perform public.save_wall_canvas_settings(current_setting('test.canvas_gym')::uuid,current_setting('test.canvas_face')::uuid,0,0.25,true,true);
  raise exception 'A stale canvas revision overwrote settings';
exception when serialization_failure then null; end;
$$;

do $$
begin
  perform public.save_wall_canvas_settings(current_setting('test.canvas_gym')::uuid,current_setting('test.canvas_legacy')::uuid,0,0.25,true,true);
  raise exception 'An unmeasured legacy wall received a structured canvas';
exception when invalid_parameter_value then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000075',true);
do $$
begin
  perform public.save_wall_canvas_settings(current_setting('test.canvas_gym')::uuid,current_setting('test.canvas_face')::uuid,1,0.25,true,true);
  raise exception 'A non-owner changed another gym''s wall canvas';
exception when insufficient_privilege then null; end;
$$;

rollback;
