-- Floorplans are owner-authored, metre-accurate, transactional and tenant-safe.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000070','00000000-0000-0000-0000-000000000000','authenticated','authenticated','floorplan-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Floorplan Owner"}'),
  ('10000000-0000-4000-8000-000000000071','00000000-0000-0000-0000-000000000000','authenticated','authenticated','floorplan-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Floorplan Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000070',true);

do $$
declare
  gym_id uuid;
  floorplan_id uuid;
  result jsonb;
  structure_id constant uuid := '20000000-0000-4000-8000-000000000070';
begin
  gym_id := public.create_my_first_gym('{"name":"Floorplan Test Gym","slug":"floorplan-test-gym","countryCode":"GB"}');
  floorplan_id := public.ensure_gym_floorplan(gym_id);
  perform set_config('test.floorplan_gym',gym_id::text,true);
  perform set_config('test.floorplan_id',floorplan_id::text,true);

  result := public.save_gym_floorplan(
    gym_id,
    floorplan_id,
    0,
    '{"widthMetres":50,"heightMetres":30,"gridSizeMetres":0.5,"showGrid":true,"snapToGrid":true}',
    jsonb_build_array(jsonb_build_object(
      'id',structure_id,'name','North wall',
      'startXMetres',2,'startYMetres',3,'endXMetres',5,'endYMetres',7,
      'thicknessMetres',0.2,'createdAt','2026-07-19T12:00:00Z'
    ))
  );
  if (result->>'revision')::bigint <> 1 then raise exception 'Revision did not advance'; end if;
  if (select length_metres from public.wall_structures where id=structure_id) <> 5.000 then raise exception 'Generated wall length is inaccurate'; end if;
end;
$$;

do $$
begin
  perform public.save_gym_floorplan(
    current_setting('test.floorplan_gym')::uuid,
    current_setting('test.floorplan_id')::uuid,
    0,
    '{"widthMetres":50,"heightMetres":30,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',
    '[]'
  );
  raise exception 'A stale revision overwrote the floorplan';
exception when serialization_failure then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000071',true);
do $$
begin
  perform public.ensure_gym_floorplan(current_setting('test.floorplan_gym')::uuid);
  raise exception 'A non-owner provisioned another gym floorplan';
exception when insufficient_privilege then null; end;
$$;

do $$
begin
  perform public.save_gym_floorplan(
    current_setting('test.floorplan_gym')::uuid,
    current_setting('test.floorplan_id')::uuid,
    1,
    '{"widthMetres":50,"heightMetres":30,"gridSizeMetres":1,"showGrid":true,"snapToGrid":true}',
    '[]'
  );
  raise exception 'A non-owner saved another gym floorplan';
exception when insufficient_privilege then null; end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000070',true);
do $$
begin
  if not exists(select 1 from public.audit_logs where gym_id=current_setting('test.floorplan_gym')::uuid and action='floorplan.saved') then
    raise exception 'Floorplan save was not audited';
  end if;
end;
$$;

rollback;
