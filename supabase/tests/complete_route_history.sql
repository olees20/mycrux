-- Every route mutation produces an immutable, analytically queryable revision.
begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values('10000000-0000-4000-8000-000000000085','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"History Owner"}');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000085',true);

do $$ declare gym_id uuid;floorplan_id uuid;result jsonb;
  structure_one constant uuid:='20000000-0000-4000-8000-000000000085';structure_two constant uuid:='20000000-0000-4000-8000-000000000086';
  face_one constant uuid:='30000000-0000-4000-8000-000000000085';face_two constant uuid:='30000000-0000-4000-8000-000000000086';
begin
  gym_id:=public.create_my_first_gym('{"name":"Complete History Gym","slug":"complete-history-gym","countryCode":"GB"}');floorplan_id:=public.ensure_gym_floorplan(gym_id);
  perform public.save_gym_floorplan(gym_id,floorplan_id,0,'{"widthMetres":30,"heightMetres":20,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(
    jsonb_build_object('id',structure_one,'name','North Block','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-21T12:00:00Z'),
    jsonb_build_object('id',structure_two,'name','South Block','startXMetres',12,'startYMetres',1,'endXMetres',20,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-21T12:00:00Z')));
  perform public.save_wall_structure_faces(gym_id,structure_one,0,jsonb_build_array(jsonb_build_object('id',face_one,'name','North Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',0,'notes','','sortOrder',0)));
  perform public.save_wall_structure_faces(gym_id,structure_two,0,jsonb_build_array(jsonb_build_object('id',face_two,'name','South Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',20,'notes','','sortOrder',0)));
  perform public.save_wall_holds(gym_id,face_one,0,jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000085','category','jug','iconKey','jug','positionXMetres',1,'positionYMetres',1,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','North hold','colour','#2563eb','manufacturer','','model','','purchaseDate','','condition','good','notes',''))));
  perform public.save_wall_holds(gym_id,face_two,0,jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000086','category','crimp','iconKey','crimp','positionXMetres',2,'positionYMetres',2,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','South hold','colour','#f97316','manufacturer','','model','','purchaseDate','','condition','good','notes',''))));
  result:=public.save_hold_based_route(gym_id,null,0,face_one,jsonb_build_object('name','Blue V5','colour','#2563eb','gradeSystem','v_scale','grade','V5','routeType','boulder','status','published','setterId',auth.uid(),'setOn','2026-07-01','retireOn','2026-10-01','description','','tags',jsonb_build_array('power')),array['40000000-0000-4000-8000-000000000085'::uuid]);
  perform set_config('test.history_gym',gym_id::text,true);perform set_config('test.history_route',result->>'route_id',true);perform set_config('test.history_face_one',face_one::text,true);perform set_config('test.history_face_two',face_two::text,true);
end; $$;

do $$ begin
  perform public.save_hold_based_route(current_setting('test.history_gym')::uuid,current_setting('test.history_route')::uuid,1,current_setting('test.history_face_one')::uuid,jsonb_build_object('name','Blue V5','colour','#2563eb','gradeSystem','v_scale','grade','V6','routeType','boulder','status','published','setterId',auth.uid(),'setOn','2026-07-01','retireOn','2026-10-01','description','','tags',jsonb_build_array('power')),array['40000000-0000-4000-8000-000000000085'::uuid]);
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=2 and changed_fields@>array['grade'] and changes->'grade'->'from'->>'value'='V5' and changes->'grade'->'to'->>'value'='V6') then raise exception 'Grade history is incomplete';end if;
end; $$;

do $$ begin
  perform public.save_wall_structure_faces(current_setting('test.history_gym')::uuid,'20000000-0000-4000-8000-000000000085',1,jsonb_build_array(jsonb_build_object('id',current_setting('test.history_face_one'),'name','North Face Renamed','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',0,'notes','','sortOrder',0)));
  set constraints walls_capture_route_history immediate;
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=3 and change_kind='wall_change' and changed_fields@>array['wall'] and wall_name='North Face Renamed' and hold_count=1) then raise exception 'Wall change history is incomplete';end if;
end; $$;

do $$ begin
  perform public.save_wall_holds(current_setting('test.history_gym')::uuid,current_setting('test.history_face_one')::uuid,1,jsonb_build_array(jsonb_build_object('id','40000000-0000-4000-8000-000000000085','category','jug','iconKey','jug','positionXMetres',3,'positionYMetres',2.5,'rotationDegrees',30,'scaleFactor',1.2,'metadata',jsonb_build_object('label','North hold moved','colour','#2563eb','manufacturer','','model','','purchaseDate','','condition','good','notes',''))));
  set constraints wall_holds_capture_route_history immediate;
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=4 and change_kind='hold_change' and changes->'holds'->>'physicalDetailsChanged'='true') then raise exception 'Physical hold modifications did not enter route history';end if;
end; $$;

set constraints route_tags_capture_route_history deferred;
insert into public.route_tags(gym_id,route_id,tag,created_by) values(current_setting('test.history_gym')::uuid,current_setting('test.history_route')::uuid,'technical',auth.uid());
set constraints route_tags_capture_route_history immediate;
do $$ begin if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=5 and changed_fields@>array['tags']) then raise exception 'Tag modification did not enter route history';end if;end; $$;

select public.retire_routes(current_setting('test.history_gym')::uuid,array[current_setting('test.history_route')::uuid]);
do $$ begin
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=6 and change_kind='retire' and retired_at is not null and changed_fields@>array['date_removed']) then raise exception 'Actual removal date is missing from history';end if;
  perform public.archive_hold_based_route(current_setting('test.history_gym')::uuid,current_setting('test.history_route')::uuid,6);
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.history_route')::uuid and version=7 and change_kind='archive' and archived_at is not null) then raise exception 'Archive history is incomplete';end if;
end; $$;

do $$ declare analytics_count bigint;begin
  select count(*) into analytics_count from public.get_route_history_analytics(current_setting('test.history_gym')::uuid,current_date-365,current_date+1,null,null,null) where route_id=current_setting('test.history_route')::uuid;
  if analytics_count<>7 then raise exception 'Historical analytics omitted route modifications: %',analytics_count;end if;
  begin delete from public.routes where id=current_setting('test.history_route')::uuid;raise exception 'Route was permanently deleted';exception when insufficient_privilege or foreign_key_violation then null;end;
end; $$;

rollback;
