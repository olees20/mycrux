-- Route-independent holds are tenant-safe, transactional wall-local objects.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000076','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hold-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Hold Owner"}'),
  ('10000000-0000-4000-8000-000000000077','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hold-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Hold Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000076',true);

do $$
declare
  local_gym_id uuid;
  floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000076';
  face_id constant uuid := '30000000-0000-4000-8000-000000000076';
  second_face_id constant uuid := '30000000-0000-4000-8000-000000000077';
  hold_id constant uuid := '40000000-0000-4000-8000-000000000076';
  result jsonb;
begin
  local_gym_id := public.create_my_first_gym('{"name":"Hold Test Gym","slug":"hold-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(local_gym_id);
  perform public.save_gym_floorplan(local_gym_id,floorplan_id,0,'{"widthMetres":30,"heightMetres":20,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Hold Block','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-19T12:00:00Z')));
  perform public.save_wall_structure_faces(local_gym_id,structure_id,0,jsonb_build_array(
    jsonb_build_object('id',face_id,'name','Main Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',15,'notes','','sortOrder',0),
    jsonb_build_object('id',second_face_id,'name','Second Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',0,'notes','','sortOrder',1)
  ));

  result := public.save_wall_holds(local_gym_id,face_id,0,jsonb_build_array(
    jsonb_build_object('id',hold_id,'category','jug','iconKey','jug','positionXMetres',1.25,'positionYMetres',2.5,'rotationDegrees',15,'scaleFactor',1.2,'metadata',jsonb_build_object('label','Blue jug','colour','#2563EB','manufacturer','Crux','notes','Reusable object')),
    jsonb_build_object('id','40000000-0000-4000-8000-000000000077','category','dual_texture','iconKey','dual_texture','positionXMetres',4,'positionYMetres',3,'rotationDegrees',355,'scaleFactor',0.8,'metadata',jsonb_build_object('label','','colour','#E11D48','manufacturer','','notes',''))
  ));
  perform set_config('test.hold_gym',local_gym_id::text,true);
  perform set_config('test.hold_face',face_id::text,true);
  perform set_config('test.hold_second_face',second_face_id::text,true);
  perform set_config('test.hold_id',hold_id::text,true);

  if (result->>'revision')::bigint <> 1 then raise exception 'Hold revision did not advance'; end if;
  if (select count(*) from public.wall_holds where wall_id=face_id and archived_at is null) <> 2 then raise exception 'Holds were not stored'; end if;
  if not exists(select 1 from public.wall_holds where id=hold_id and category='jug' and position_x_metres=1.250 and metadata->>'label'='Blue jug') then raise exception 'Hold values were not preserved'; end if;
  if not exists(select 1 from public.audit_logs where gym_id=local_gym_id and action='wall_holds.saved') then raise exception 'Hold save was not audited'; end if;
end;
$$;

do $$
begin
  perform public.save_wall_holds(current_setting('test.hold_gym')::uuid,current_setting('test.hold_face')::uuid,0,'[]');
  raise exception 'A stale revision overwrote holds';
exception when serialization_failure then null; end;
$$;

do $$
begin
  perform public.save_wall_holds(current_setting('test.hold_gym')::uuid,current_setting('test.hold_second_face')::uuid,0,jsonb_build_array(jsonb_build_object('id',current_setting('test.hold_id'),'category','jug','iconKey','jug','positionXMetres',1,'positionYMetres',1,'rotationDegrees',0,'scaleFactor',1,'metadata','{}'::jsonb)));
  raise exception 'A hold identifier was claimed by another face';
exception when insufficient_privilege then null; end;
$$;

set local role postgres;
do $$
begin
  update public.walls set width_metres=1 where id=current_setting('test.hold_face')::uuid;
  raise exception 'A face resize orphaned a hold';
exception when raise_exception then
  if sqlerrm not like '%holds first%' then raise; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000077',true);
do $$
begin
  perform public.save_wall_holds(current_setting('test.hold_gym')::uuid,current_setting('test.hold_face')::uuid,1,'[]');
  raise exception 'A non-owner changed another gym''s holds';
exception when insufficient_privilege then null; end;
$$;

set local role postgres;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='wall_holds' and column_name='route_id'
  ) then raise exception 'Holds must remain independent from routes'; end if;
end;
$$;

rollback;
