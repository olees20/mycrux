-- Gym setup progress is resumable, owner-only, and requires canonical setup records.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','setup-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Setup Owner"}'),
  ('10000000-0000-4000-8000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','setup-other@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Setup Other"}');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000010', true);

do $$
declare gym_id uuid;
begin
  gym_id := public.create_my_first_gym('{"name":"Setup Wizard Gym","slug":"setup-wizard-gym","countryCode":"GB"}');
  perform set_config('test.setup_gym', gym_id::text, true);
  if (select setup_current_step from public.gyms where id=gym_id) <> 1 then raise exception 'New gym did not start at step 1'; end if;

  perform public.save_gym_setup_step(gym_id,1,'{"name":"Setup Wizard Gym","contactEmail":"hello@setup.example.invalid","contactPhone":"0113 000 0000","primaryColour":"#17211B","accentColour":"#D9FF45","backgroundColour":"#F7F7F2"}');
  perform public.save_gym_setup_step(gym_id,2,'{"addressLine1":"10 Test Street","addressLine2":"","city":"Leeds","postcode":"LS1 1AA","countryCode":"GB","timezone":"Europe/London"}');
  perform public.save_gym_setup_step(gym_id,3,'{"disciplines":["bouldering","sport"],"gradeSystems":["Font","French"],"defaultRouteType":"boulder","defaultGrade":"6A"}');

  begin
    perform public.save_gym_setup_step(gym_id,4,'{}');
    raise exception 'Wall requirement was not enforced';
  exception when check_violation then null; end;

  insert into public.walls(gym_id,name,description) values(gym_id,'Main Wall','First setup area');
  perform public.save_gym_setup_step(gym_id,4,'{}');
  perform public.save_gym_setup_step(gym_id,5,'{"publicJoinRequestsEnabled":true}');

  if (select setup_current_step from public.gyms where id=gym_id) <> 6 then raise exception 'Progress did not reach completion review'; end if;
  if (select settings->'route_defaults'->>'default_grade' from public.gyms where id=gym_id) <> '6A' then raise exception 'Route defaults were not saved'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000011', true);
do $$
begin
  perform public.save_gym_setup_step(current_setting('test.setup_gym')::uuid,6,'{}');
  raise exception 'A non-owner completed another gym setup';
exception when insufficient_privilege then null; end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000010', true);
select public.save_gym_setup_step(current_setting('test.setup_gym')::uuid,6,'{}');

do $$
begin
  if (select setup_completed_at from public.gyms where id=current_setting('test.setup_gym')::uuid) is null then raise exception 'Setup completion was not recorded'; end if;
  if not exists(select 1 from public.audit_logs where gym_id=current_setting('test.setup_gym')::uuid and action='gym.setup.completed') then raise exception 'Setup completion was not audited'; end if;
end;
$$;

rollback;
