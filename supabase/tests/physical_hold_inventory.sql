-- Canonical physical holds expose current placement/routes and append-only history.
begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
 ('10000000-0000-4000-8000-000000000080','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inventory-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Inventory Owner"}'),
 ('10000000-0000-4000-8000-000000000081','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inventory-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Inventory Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000080',true);

do $$
declare gym_id uuid; floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000080';
  face_id constant uuid := '30000000-0000-4000-8000-000000000080';
begin
  gym_id:=public.create_my_first_gym('{"name":"Inventory Gym","slug":"inventory-gym","countryCode":"GB"}');
  floorplan_id:=public.ensure_gym_floorplan(gym_id);
  perform public.save_gym_floorplan(gym_id,floorplan_id,0,'{"widthMetres":20,"heightMetres":10,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Inventory Wall','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-21T12:00:00Z')));
  perform public.save_wall_structure_faces(gym_id,structure_id,0,jsonb_build_array(jsonb_build_object('id',face_id,'name','Inventory Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',0,'notes','','sortOrder',0)));
  perform public.save_wall_holds(gym_id,face_id,0,jsonb_build_array(
    jsonb_build_object('id','40000000-0000-4000-8000-000000000080','category','jug','iconKey','jug','positionXMetres',1,'positionYMetres',1,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Inventory 1','manufacturer','Core','model','Geo Jug','colour','#112233','purchaseDate','2026-01-10','condition','new','notes','Batch A')),
    jsonb_build_object('id','40000000-0000-4000-8000-000000000081','category','crimp','iconKey','crimp','positionXMetres',2,'positionYMetres',2,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Inventory 2','manufacturer','Core','model','Edge','colour','#445566','purchaseDate','','condition','good','notes',''))
  ));
  perform set_config('test.inventory_gym',gym_id::text,true);
  perform set_config('test.inventory_face',face_id::text,true);
  if not exists(select 1 from public.wall_holds where id='40000000-0000-4000-8000-000000000080' and manufacturer='Core' and model='Geo Jug' and colour='#112233' and purchased_on='2026-01-10' and condition='new') then raise exception 'Canonical inventory fields were not stored'; end if;
  if (select count(*) from public.wall_holds where id='40000000-0000-4000-8000-000000000080')<>1 then raise exception 'Physical inventory record was duplicated'; end if;
  if not exists(select 1 from public.hold_inventory_events where hold_id='40000000-0000-4000-8000-000000000080' and event_type='inventory_created') then raise exception 'Inventory creation history is missing'; end if;
end;
$$;

do $$ begin
  perform public.save_wall_holds(current_setting('test.inventory_gym')::uuid,current_setting('test.inventory_face')::uuid,1,jsonb_build_array(
    jsonb_build_object('id','40000000-0000-4000-8000-000000000080','category','jug','iconKey','jug','positionXMetres',1.5,'positionYMetres',1,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Inventory 1','manufacturer','Core','model','Geo Jug II','colour','#112233','purchaseDate','2026-01-10','condition','fair','notes','Batch A')),
    jsonb_build_object('id','40000000-0000-4000-8000-000000000081','category','crimp','iconKey','crimp','positionXMetres',2,'positionYMetres',2,'rotationDegrees',0,'scaleFactor',1,'metadata',jsonb_build_object('label','Inventory 2','manufacturer','Core','model','Edge','colour','#445566','purchaseDate','','condition','good','notes',''))
  ));
  if not exists(select 1 from public.wall_holds where id='40000000-0000-4000-8000-000000000080' and model='Geo Jug II' and condition='fair') then raise exception 'Inventory update did not reach canonical record'; end if;
  if not exists(select 1 from public.hold_inventory_events where hold_id='40000000-0000-4000-8000-000000000080' and event_type='position_updated') then raise exception 'Inventory position history is missing'; end if;
end; $$;

do $$
declare result jsonb; current_route_id uuid; assigned_count bigint;
begin
  result:=public.save_hold_based_route(current_setting('test.inventory_gym')::uuid,null,0,current_setting('test.inventory_face')::uuid,jsonb_build_object('name','Inventory Route','colour','#112233','gradeSystem','font','grade','6A','routeType','boulder','status','published','setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','','tags','[]'::jsonb),array['40000000-0000-4000-8000-000000000080'::uuid,'40000000-0000-4000-8000-000000000081'::uuid]);
  current_route_id:=(result->>'route_id')::uuid;
  perform set_config('test.inventory_route',current_route_id::text,true);
  set constraints route_holds_capture_inventory immediate;
  select count(*) into assigned_count from public.hold_inventory_events event where event.route_id=current_route_id and event.event_type='route_assigned';
  if assigned_count<>2 then raise exception 'Route creation did not update inventory assignments'; end if;

  set constraints route_holds_capture_inventory deferred;
  perform public.save_hold_based_route(current_setting('test.inventory_gym')::uuid,current_route_id,1,current_setting('test.inventory_face')::uuid,jsonb_build_object('name','Inventory Route','colour','#112233','gradeSystem','font','grade','6A+','routeType','boulder','status','published','setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','','tags','[]'::jsonb),array['40000000-0000-4000-8000-000000000080'::uuid]);
  set constraints route_holds_capture_inventory immediate;
  if (select count(*) from public.hold_inventory_events event where event.route_id=current_route_id and event.hold_id='40000000-0000-4000-8000-000000000080' and event.event_type='route_assigned')<>1 then raise exception 'No-op route assignment produced duplicate inventory history'; end if;
  if not exists(select 1 from public.hold_inventory_events event where event.route_id=current_route_id and event.hold_id='40000000-0000-4000-8000-000000000081' and event.event_type='route_unassigned') then raise exception 'Route change did not update removed hold inventory'; end if;
end;
$$;

do $$ begin
  delete from public.hold_inventory_events where hold_id='40000000-0000-4000-8000-000000000080';
  raise exception 'Inventory history was mutable';
exception when insufficient_privilege then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000081',true);
do $$ begin
  if exists(select 1 from public.hold_inventory_events where gym_id=current_setting('test.inventory_gym')::uuid) then raise exception 'Non-member read inventory history'; end if;
end; $$;

rollback;
