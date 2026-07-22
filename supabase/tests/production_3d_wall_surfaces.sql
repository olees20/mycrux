-- Custom 3D faces remain owner-authored, member-readable and tenant isolated.
begin;

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
('10000000-0000-4000-8000-000000000098','00000000-0000-0000-0000-000000000000','authenticated','authenticated','twin-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Twin Owner"}'),
('10000000-0000-4000-8000-000000000099','00000000-0000-0000-0000-000000000000','authenticated','authenticated','twin-outsider@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Twin Outsider"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000098',true);

do $$
declare
  gym_id uuid;
  floorplan_id uuid;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000098';
  selected_face_id constant uuid := '30000000-0000-4000-8000-000000000098';
begin
  gym_id := public.create_my_first_gym('{"name":"3D Twin Test Gym","slug":"3d-twin-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(gym_id);
  perform public.save_gym_floorplan(gym_id,floorplan_id,0,'{"widthMetres":40,"heightMetres":30,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',jsonb_build_array(jsonb_build_object('id',structure_id,'name','Faceted Block','startXMetres',2,'startYMetres',2,'endXMetres',12,'endYMetres',2,'thicknessMetres',0.3)));
  perform public.save_wall_structure_faces(gym_id,structure_id,0,jsonb_build_array(jsonb_build_object(
    'id',selected_face_id,'name','Irregular Face','widthMetres',8,'heightMetres',5,'climbingAngleDegrees',25,'notes','',
    'sortOrder',0,'surfaceKind','custom','profile','overhang','facingDirection',-1,'localOffsetU',0.5,
    'localOffsetV',0.25,'localOffsetDepth',0.1,'materialColour','#d6d3d1','vertices',jsonb_build_array(
      jsonb_build_object('order',0,'u',0,'v',0,'depth',0,'connectionKey',null),
      jsonb_build_object('order',1,'u',8,'v',0,'depth',0,'connectionKey',null),
      jsonb_build_object('order',2,'u',7,'v',5,'depth',0.2,'connectionKey',null),
      jsonb_build_object('order',3,'u',1,'v',5,'depth',0,'connectionKey',null)
    )
  )));
  perform set_config('test.twin_gym',gym_id::text,true);
  perform set_config('test.twin_structure',structure_id::text,true);
  if (select count(*) from public.wall_face_vertices vertex_row where vertex_row.face_id=selected_face_id) <> 4 then raise exception 'Custom vertices were not persisted'; end if;
  if (select surface_kind from public.walls face where face.id=selected_face_id) <> 'custom' then raise exception 'Surface kind was not persisted'; end if;
end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',true);
do $$ begin
  if (select count(*) from public.wall_face_vertices) <> 0 then raise exception 'An outsider read another gym surface'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000098',true);
do $$ begin
  perform public.save_wall_structure_faces(current_setting('test.twin_gym')::uuid,current_setting('test.twin_structure')::uuid,1,jsonb_build_array(jsonb_build_object(
    'id','30000000-0000-4000-8000-000000000098','name','Crossed Face','widthMetres',8,'heightMetres',5,
    'climbingAngleDegrees',0,'notes','','sortOrder',0,'surfaceKind','custom','vertices',jsonb_build_array(
      jsonb_build_object('order',0,'u',0,'v',0,'depth',0),jsonb_build_object('order',1,'u',8,'v',5,'depth',0),
      jsonb_build_object('order',2,'u',0,'v',5,'depth',0),jsonb_build_object('order',3,'u',8,'v',0,'depth',0)
    )
  )));
  raise exception 'A self-intersecting surface was accepted';
exception when invalid_parameter_value then null; end $$;

rollback;
