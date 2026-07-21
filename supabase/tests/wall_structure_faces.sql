-- Structured climbing faces are ordered, measured, owner-managed, and route-safe.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000072','00000000-0000-0000-0000-000000000000','authenticated','authenticated','face-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Face Owner"}'),
  ('10000000-0000-4000-8000-000000000073','00000000-0000-0000-0000-000000000000','authenticated','authenticated','face-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Face Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000072',true);

do $$
declare
  local_gym_id uuid;
  floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000072';
  north_id constant uuid := '30000000-0000-4000-8000-000000000072';
  roof_id constant uuid := '30000000-0000-4000-8000-000000000073';
  result jsonb;
begin
  local_gym_id := public.create_my_first_gym('{"name":"Face Test Gym","slug":"face-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(local_gym_id);
  perform public.save_gym_floorplan(
    local_gym_id, floorplan_id, 0,
    '{"widthMetres":40,"heightMetres":30,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',
    jsonb_build_array(jsonb_build_object('id',structure_id,'name','Main Block','startXMetres',2,'startYMetres',2,'endXMetres',12,'endYMetres',2,'thicknessMetres',0.3,'createdAt','2026-07-19T12:00:00Z'))
  );
  result := public.save_wall_structure_faces(
    local_gym_id, structure_id, 0,
    jsonb_build_array(
      jsonb_build_object('id',north_id,'name','North Face','widthMetres',8,'heightMetres',4.5,'climbingAngleDegrees',0,'notes','Main vertical face','sortOrder',0),
      jsonb_build_object('id',roof_id,'name','Roof','widthMetres',5,'heightMetres',3,'climbingAngleDegrees',90,'notes','','sortOrder',1)
    )
  );
  perform set_config('test.face_gym',local_gym_id::text,true);
  perform set_config('test.face_floorplan',floorplan_id::text,true);
  perform set_config('test.face_structure',structure_id::text,true);
  perform set_config('test.face_north',north_id::text,true);
  if (result->>'revision')::bigint <> 1 then raise exception 'Face revision did not advance'; end if;
  if (select width_metres from public.walls where id=north_id) <> 8.000 then raise exception 'Face width was not stored'; end if;
  if (select climbing_angle_degrees from public.walls where id=roof_id) <> 90.00 then raise exception 'Face angle was not stored'; end if;
  if not exists(select 1 from public.audit_logs log where log.gym_id=local_gym_id and log.action='wall_structure.faces_saved') then raise exception 'Face save was not audited'; end if;
end;
$$;

do $$
begin
  perform public.save_wall_structure_faces(current_setting('test.face_gym')::uuid,current_setting('test.face_structure')::uuid,0,'[]');
  raise exception 'A stale face revision overwrote changes';
exception when serialization_failure then null; end;
$$;

do $$
declare affected integer;
begin
  update public.walls set name='Bypassed RPC' where id=current_setting('test.face_north')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Structured face mutation bypassed the audited RPC'; end if;
end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000073',true);
do $$
begin
  perform public.save_wall_structure_faces(current_setting('test.face_gym')::uuid,current_setting('test.face_structure')::uuid,1,'[]');
  raise exception 'A non-owner changed another gym''s faces';
exception when insufficient_privilege then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000072',true);
insert into public.routes(gym_id,wall_id,name,colour,grade,route_type,status)
values(current_setting('test.face_gym')::uuid,current_setting('test.face_north')::uuid,'History route','Blue','6A','boulder','draft');

do $$
begin
  perform public.save_wall_structure_faces(current_setting('test.face_gym')::uuid,current_setting('test.face_structure')::uuid,1,'[]');
  raise exception 'A face with route history was deleted';
exception when foreign_key_violation then null; end;
$$;

do $$
begin
  perform public.save_gym_floorplan(
    current_setting('test.face_gym')::uuid,current_setting('test.face_floorplan')::uuid,1,
    '{"widthMetres":40,"heightMetres":30,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}','[]'
  );
  raise exception 'A structure with active faces was deleted';
exception when raise_exception then
  if sqlerrm not like '%climbing faces first%' then raise; end if;
end;
$$;

rollback;
