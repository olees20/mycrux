-- Hold-side editing updates many-to-many routes, immutable route history and inventory atomically.
begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
 ('10000000-0000-4000-8000-000000000082','00000000-0000-0000-0000-000000000000','authenticated','authenticated','advanced-hold-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Advanced Hold Owner"}'),
 ('10000000-0000-4000-8000-000000000083','00000000-0000-0000-0000-000000000000','authenticated','authenticated','advanced-hold-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Advanced Hold Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000082',true);

do $$
declare gym_id uuid; floorplan_id uuid; first_result jsonb; second_result jsonb;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000082';
  face_id constant uuid := '30000000-0000-4000-8000-000000000082';
  first_hold constant uuid := '40000000-0000-4000-8000-000000000082';
  second_hold constant uuid := '40000000-0000-4000-8000-000000000083';
begin
  gym_id:=public.create_my_first_gym('{"name":"Advanced Hold Gym","slug":"advanced-hold-gym","countryCode":"GB"}');
  floorplan_id:=public.ensure_gym_floorplan(gym_id);
  perform public.save_gym_floorplan(gym_id,floorplan_id,0,'{"widthMetres":20,"heightMetres":10,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Main Wall','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-21T12:00:00Z')));
  perform public.save_wall_structure_faces(gym_id,structure_id,0,jsonb_build_array(jsonb_build_object('id',face_id,'name','North Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',0,'notes','','sortOrder',0)));
  perform public.save_wall_holds(gym_id,face_id,0,jsonb_build_array(
    jsonb_build_object('id',first_hold,'category','jug','iconKey','jug','positionXMetres',1,'positionYMetres',1,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Original hold','manufacturer','Core','model','Jug 1','colour','#2563eb','purchaseDate','2025-01-01','condition','good','notes','original')), 
    jsonb_build_object('id',second_hold,'category','crimp','iconKey','crimp','positionXMetres',2,'positionYMetres',2,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Other hold','manufacturer','Core','model','Edge 1','colour','#f97316','purchaseDate','','condition','good','notes',''))
  ));
  first_result:=public.save_hold_based_route(gym_id,null,0,face_id,jsonb_build_object('name','Blue V5','colour','#2563eb','gradeSystem','v_scale','grade','V5','routeType','boulder','status','published','setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','','tags','[]'::jsonb),array[second_hold]);
  second_result:=public.save_hold_based_route(gym_id,null,0,face_id,jsonb_build_object('name','Orange V7','colour','#f97316','gradeSystem','v_scale','grade','V7','routeType','boulder','status','published','setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','','tags','[]'::jsonb),array[second_hold]);
  perform set_config('test.advanced_gym',gym_id::text,true);perform set_config('test.advanced_face',face_id::text,true);
  perform set_config('test.advanced_route_one',first_result->>'route_id',true);perform set_config('test.advanced_route_two',second_result->>'route_id',true);
end;
$$;

do $$ declare result jsonb; begin
  result:=public.save_hold_route_assignments(current_setting('test.advanced_gym')::uuid,current_setting('test.advanced_face')::uuid,
    jsonb_build_object(current_setting('test.advanced_route_one'),1,current_setting('test.advanced_route_two'),1),
    jsonb_build_array(jsonb_build_object('holdId','40000000-0000-4000-8000-000000000082','routeIds',jsonb_build_array(current_setting('test.advanced_route_one'),current_setting('test.advanced_route_two')))));
  set constraints route_holds_capture_inventory immediate;
  if (select count(*) from public.route_holds where hold_id='40000000-0000-4000-8000-000000000082')<>2 then raise exception 'Side-panel assignment did not add both routes'; end if;
  if (result->>current_setting('test.advanced_route_one'))::int<>2 or (result->>current_setting('test.advanced_route_two'))::int<>2 then raise exception 'Assignment did not advance route revisions'; end if;
  if (select count(*) from public.route_versions where route_id in(current_setting('test.advanced_route_one')::uuid,current_setting('test.advanced_route_two')::uuid) and version=2)<>2 then raise exception 'Assignment history snapshots are missing'; end if;
  if (select count(*) from public.hold_inventory_events where hold_id='40000000-0000-4000-8000-000000000082' and event_type='route_assigned')<>2 then raise exception 'Assignment inventory history is missing'; end if;
end; $$;

set constraints route_holds_capture_inventory deferred;
do $$ declare result jsonb; begin
  result:=public.save_hold_route_assignments(current_setting('test.advanced_gym')::uuid,current_setting('test.advanced_face')::uuid,
    jsonb_build_object(current_setting('test.advanced_route_one'),2,current_setting('test.advanced_route_two'),2),
    jsonb_build_array(jsonb_build_object('holdId','40000000-0000-4000-8000-000000000082','routeIds',jsonb_build_array(current_setting('test.advanced_route_two')))));
  set constraints route_holds_capture_inventory immediate;
  if exists(select 1 from public.route_holds where route_id=current_setting('test.advanced_route_one')::uuid and hold_id='40000000-0000-4000-8000-000000000082') then raise exception 'Side-panel assignment did not remove a route'; end if;
  if (result->>current_setting('test.advanced_route_one'))::int<>3 then raise exception 'Removed route did not gain a history revision'; end if;
  if not exists(select 1 from public.hold_inventory_events where route_id=current_setting('test.advanced_route_one')::uuid and hold_id='40000000-0000-4000-8000-000000000082' and event_type='route_unassigned') then raise exception 'Unassignment inventory history is missing'; end if;
end; $$;

do $$ begin
  perform public.save_hold_route_assignments(current_setting('test.advanced_gym')::uuid,current_setting('test.advanced_face')::uuid,jsonb_build_object(current_setting('test.advanced_route_two'),1),jsonb_build_array(jsonb_build_object('holdId','40000000-0000-4000-8000-000000000082','routeIds','[]'::jsonb)));
  raise exception 'Stale side-panel assignment overwrote route history';
exception when serialization_failure then null; end; $$;

set constraints route_holds_capture_inventory deferred;
do $$ declare result jsonb; begin
  result:=public.replace_physical_hold(current_setting('test.advanced_gym')::uuid,'40000000-0000-4000-8000-000000000082','40000000-0000-4000-8000-000000000084',1);
  set constraints route_holds_capture_inventory immediate;
  if (result->>'revision')::int<>2 then raise exception 'Replacement did not advance the hold library revision'; end if;
  if not exists(select 1 from public.wall_holds where id='40000000-0000-4000-8000-000000000082' and archived_at is not null) then raise exception 'Replaced hold was not preserved as archived inventory'; end if;
  if not exists(select 1 from public.wall_holds where id='40000000-0000-4000-8000-000000000084' and archived_at is null and model='Jug 1' and condition='new' and purchased_on is null) then raise exception 'Replacement did not create one clean physical inventory record'; end if;
  if (select count(*) from public.wall_holds where id in('40000000-0000-4000-8000-000000000082','40000000-0000-4000-8000-000000000084'))<>2 then raise exception 'Replacement duplicated inventory records'; end if;
  if not exists(select 1 from public.route_holds where route_id=current_setting('test.advanced_route_two')::uuid and hold_id='40000000-0000-4000-8000-000000000084') then raise exception 'Replacement did not move active route membership'; end if;
  if not exists(select 1 from public.audit_logs where action='hold.replaced' and target_id='40000000-0000-4000-8000-000000000084') then raise exception 'Replacement audit entry is missing'; end if;
end; $$;

set constraints route_holds_capture_inventory deferred;
do $$ begin
  perform public.retire_physical_hold(current_setting('test.advanced_gym')::uuid,'40000000-0000-4000-8000-000000000084',2);
  set constraints route_holds_capture_inventory immediate;
  if not exists(select 1 from public.wall_holds where id='40000000-0000-4000-8000-000000000084' and archived_at is not null and condition='retired') then raise exception 'Delete did not recoverably retire the physical hold'; end if;
  if exists(select 1 from public.route_holds where hold_id='40000000-0000-4000-8000-000000000084') then raise exception 'Retired hold remains on an active route'; end if;
  if not exists(select 1 from public.audit_logs where action='hold.retired' and target_id='40000000-0000-4000-8000-000000000084') then raise exception 'Retirement audit entry is missing'; end if;
end; $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000083',true);
do $$ begin
  perform public.retire_physical_hold(current_setting('test.advanced_gym')::uuid,'40000000-0000-4000-8000-000000000083',3);
  raise exception 'Unauthorised user retired a hold';
exception when insufficient_privilege then null; end; $$;

rollback;
