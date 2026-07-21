-- Routes are many-to-many hold collections with immutable definition history.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000078','00000000-0000-0000-0000-000000000000','authenticated','authenticated','route-hold-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Route Hold Owner"}'),
  ('10000000-0000-4000-8000-000000000079','00000000-0000-0000-0000-000000000000','authenticated','authenticated','route-hold-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Route Hold Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000078',true);

do $$
declare
  local_gym_id uuid;
  floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000078';
  face_id constant uuid := '30000000-0000-4000-8000-000000000078';
  hold_one constant uuid := '40000000-0000-4000-8000-000000000078';
  hold_two constant uuid := '40000000-0000-4000-8000-000000000079';
  result jsonb;
  current_route_id uuid;
begin
  local_gym_id := public.create_my_first_gym('{"name":"Route Hold Test Gym","slug":"route-hold-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(local_gym_id);
  perform public.save_gym_floorplan(local_gym_id,floorplan_id,0,'{"widthMetres":30,"heightMetres":20,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Route Block','startXMetres',1,'startYMetres',1,'endXMetres',9,'endYMetres',1,'thicknessMetres',0.2,'createdAt','2026-07-21T12:00:00Z')));
  perform public.save_wall_structure_faces(local_gym_id,structure_id,0,jsonb_build_array(jsonb_build_object('id',face_id,'name','Route Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',15,'notes','','sortOrder',0)));
  perform public.save_wall_holds(local_gym_id,face_id,0,jsonb_build_array(
    jsonb_build_object('id',hold_one,'category','jug','iconKey','jug','positionXMetres',1.25,'positionYMetres',2.5,'rotationDegrees',15,'scaleFactor',1.2,'metadata',jsonb_build_object('label','Shared jug','colour','#2563EB','manufacturer','','notes','')),
    jsonb_build_object('id',hold_two,'category','crimp','iconKey','crimp','positionXMetres',4,'positionYMetres',3,'rotationDegrees',0,'scaleFactor',0.8,'metadata',jsonb_build_object('label','Finish','colour','#DC2626','manufacturer','','notes',''))
  ));

  result := public.save_hold_based_route(local_gym_id,null,0,face_id,jsonb_build_object(
    'name','Shared Holds','colour','#2563eb','gradeSystem','font','grade','6B','routeType','boulder','status','draft',
    'setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','First definition','tags',jsonb_build_array('technical')
  ),array[hold_one,hold_two]);
  current_route_id := (result->>'route_id')::uuid;
  perform set_config('test.route_hold_gym',local_gym_id::text,true);
  perform set_config('test.route_hold_face',face_id::text,true);
  perform set_config('test.route_hold_route',current_route_id::text,true);
  perform set_config('test.route_hold_one',hold_one::text,true);

  if (result->>'revision')::bigint <> 1 then raise exception 'Created route did not produce one complete definition revision'; end if;
  if (select count(*) from public.route_holds assignment where assignment.route_id=current_route_id) <> 2 then raise exception 'Route hold collection was not stored'; end if;
  if (select count(*) from public.route_version_holds item join public.route_versions version on version.id=item.route_version_id where version.route_id=current_route_id and version.version=1) <> 2 then raise exception 'Route version did not snapshot holds'; end if;
  if not exists(select 1 from public.route_versions version where version.route_id=current_route_id and version.version=1 and version.tags='["technical"]'::jsonb) then raise exception 'Route metadata history was not captured'; end if;
end;
$$;

do $$ begin
  insert into public.routes(gym_id,wall_id,name,colour,grade,history_ready)
  values(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_face')::uuid,'No history','#000000','6A',false);
  raise exception 'A direct insert bypassed route history';
exception when insufficient_privilege then null; end;
$$;

do $$
declare result jsonb;
begin
  result := public.save_hold_based_route(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_route')::uuid,1,current_setting('test.route_hold_face')::uuid,jsonb_build_object(
    'name','Shared Holds Edited','colour','#16a34a','gradeSystem','font','grade','6B+','routeType','boulder','status','published',
    'setterId',auth.uid(),'setOn',current_date::text,'retireOn','','description','Edited definition','tags',jsonb_build_array('power')
  ),array[current_setting('test.route_hold_one')::uuid]);
  if (result->>'revision')::bigint <> 2 then raise exception 'Edit did not advance route history'; end if;
  if (select count(*) from public.route_holds where route_id=current_setting('test.route_hold_route')::uuid) <> 1 then raise exception 'Edited hold collection was not replaced'; end if;
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.route_hold_route')::uuid and version=2 and change_kind='publish' and name='Shared Holds Edited') then raise exception 'Published edit history is incomplete'; end if;
end;
$$;

do $$ begin
  perform public.save_hold_based_route(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_route')::uuid,1,current_setting('test.route_hold_face')::uuid,jsonb_build_object('name','Stale','colour','#000000','gradeSystem','font','grade','6A','routeType','boulder','status','draft','setterId','','setOn','','retireOn','','description','','tags','[]'::jsonb),array[current_setting('test.route_hold_one')::uuid]);
  raise exception 'A stale route edit overwrote history';
exception when serialization_failure then null; end;
$$;

do $$
begin
  perform public.save_wall_holds(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_face')::uuid,1,jsonb_build_array(
    jsonb_build_object('id',current_setting('test.route_hold_one'),'category','jug','iconKey','jug','positionXMetres',2,'positionYMetres',2.5,'rotationDegrees',15,'scaleFactor',1.2,'metadata',jsonb_build_object('label','Shared jug moved','colour','#2563EB','manufacturer','','notes','')),
    jsonb_build_object('id','40000000-0000-4000-8000-000000000079','category','crimp','iconKey','crimp','positionXMetres',4,'positionYMetres',3,'rotationDegrees',0,'scaleFactor',0.8,'metadata',jsonb_build_object('label','Finish','colour','#DC2626','manufacturer','','notes',''))
  ));
  if not exists(
    select 1 from public.route_version_holds item join public.route_versions version on version.id=item.route_version_id
    where version.route_id=current_setting('test.route_hold_route')::uuid and version.version=1
      and item.hold_id=current_setting('test.route_hold_one')::uuid and item.position_x_metres=1.250
  ) then raise exception 'Moving a reusable hold rewrote route history'; end if;
end;
$$;

do $$
declare result jsonb; copied_id uuid;
begin
  result := public.duplicate_hold_based_route(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_route')::uuid,2);
  copied_id := (result->>'route_id')::uuid;
  perform set_config('test.route_hold_copy',copied_id::text,true);
  if copied_id=current_setting('test.route_hold_route')::uuid then raise exception 'Duplicate reused route identity'; end if;
  if not exists(select 1 from public.route_holds original join public.route_holds copied on copied.hold_id=original.hold_id where original.route_id=current_setting('test.route_hold_route')::uuid and copied.route_id=copied_id) then raise exception 'One hold could not belong to multiple routes'; end if;
  if not exists(select 1 from public.routes where id=copied_id and status='draft' and duplicated_from_route_id=current_setting('test.route_hold_route')::uuid) then raise exception 'Duplicate provenance was not retained'; end if;
end;
$$;

do $$
declare result jsonb;
begin
  result := public.archive_hold_based_route(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_route')::uuid,2);
  if (result->>'revision')::bigint <> 3 then raise exception 'Archive did not create a revision'; end if;
  if not exists(select 1 from public.routes where id=current_setting('test.route_hold_route')::uuid and status='archived' and archived_at is not null) then raise exception 'Route was not archived'; end if;
  if not exists(select 1 from public.route_versions where route_id=current_setting('test.route_hold_route')::uuid and version=3 and change_kind='archive') then raise exception 'Archive history is missing'; end if;
  begin
    delete from public.routes where id=current_setting('test.route_hold_route')::uuid;
    raise exception 'Route was permanently deleted';
  exception when insufficient_privilege then null; end;
end;
$$;

do $$ begin
  perform public.save_wall_holds(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_face')::uuid,2,jsonb_build_array(
    jsonb_build_object('id','40000000-0000-4000-8000-000000000079','category','crimp','iconKey','crimp','positionXMetres',4,'positionYMetres',3,'rotationDegrees',0,'scaleFactor',0.8,'metadata',jsonb_build_object('label','Finish','colour','#DC2626','manufacturer','','notes',''))
  ));
  raise exception 'A hold used by an active duplicated route was archived';
exception when invalid_parameter_value then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000079',true);
do $$ begin
  perform public.duplicate_hold_based_route(current_setting('test.route_hold_gym')::uuid,current_setting('test.route_hold_copy')::uuid,1);
  raise exception 'Unauthorised user duplicated a route';
exception when insufficient_privilege then null; end;
$$;

set local role postgres;
do $$ begin
  if not exists(select 1 from public.audit_logs where action='route.created')
    or not exists(select 1 from public.audit_logs where action='route.edited')
    or not exists(select 1 from public.audit_logs where action='route.duplicated')
    or not exists(select 1 from public.audit_logs where action='route.archived') then
    raise exception 'Route lifecycle audit is incomplete';
  end if;
end; $$;

rollback;
