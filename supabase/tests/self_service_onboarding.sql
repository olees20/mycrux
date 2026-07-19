-- Self-service onboarding remains caller-bound, verified, atomic, one-time and audited.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','new-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"New Gym Owner"}'),
  ('10000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unverified-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),null,'{"provider":"email","providers":["email"]}','{"display_name":"Unverified Owner"}'),
  ('10000000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-owner@crux.example.invalid',extensions.crypt('Synthetic-password-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Other Owner"}');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);

do $$
declare created_gym_id uuid;
begin
  if not public.is_gym_slug_available('onboarding-test-gym') then raise exception 'Unused valid slug was unavailable'; end if;
  created_gym_id := public.create_my_first_gym(
    '{"name":"Onboarding Test Gym","slug":"onboarding-test-gym","countryCode":"GB","addressLine1":"7 Synthetic Street","addressLine2":"Unit 2","city":"Leeds","postcode":"LS1 7AA","contactEmail":"hello@onboarding.example.invalid","contactPhone":"0113 000 0000","websiteUrl":"https://onboarding.example.invalid"}'
  );
  perform set_config('test.created_gym', created_gym_id::text, true);

  if public.is_gym_slug_available('onboarding-test-gym') then raise exception 'Claimed slug remained available'; end if;
  if not exists (
    select 1 from public.gyms
    where id = created_gym_id and slug = 'onboarding-test-gym' and status = 'trial'
      and contact_email = 'hello@onboarding.example.invalid'
      and website_url = 'https://onboarding.example.invalid'
  ) then raise exception 'Self-service gym details were not stored'; end if;
  if not exists (
    select 1 from public.gym_memberships
    where gym_id = created_gym_id and profile_id = auth.uid() and role = 'owner' and status = 'active'
  ) then raise exception 'Creator did not become the owner'; end if;
  if (select count(*) from public.gym_memberships where gym_id = created_gym_id) <> 1 then
    raise exception 'Creation assigned an unexpected membership';
  end if;
  if (select count(*) from public.staff_roles where gym_id = created_gym_id and is_system) <> 4 then
    raise exception 'Canonical staff roles were not provisioned';
  end if;
  if not exists (
    select 1 from public.gym_branding
    where gym_id = created_gym_id and primary_colour = '#17211B' and accent_colour = '#D9FF45' and background_colour = '#F7F7F2'
  ) then raise exception 'Default branding was not provisioned'; end if;
  if not exists (
    select 1 from public.audit_logs
    where gym_id = created_gym_id and actor_profile_id = auth.uid() and action = 'gym.self_created'
  ) then raise exception 'Self-service creation was not audited'; end if;
  if (select onboarding_completed_at from public.profiles where id = auth.uid()) is null then
    raise exception 'Profile onboarding completion was not recorded';
  end if;

  begin
    perform public.create_my_first_gym('{"name":"Second Gym","slug":"second-onboarding-gym","countryCode":"GB"}');
    raise exception 'Duplicate submission created a second gym';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000009', true);
do $$
declare created_gym_id uuid := current_setting('test.created_gym')::uuid;
begin
  begin
    perform public.create_my_first_gym('{"name":"Duplicate Slug Gym","slug":"onboarding-test-gym","countryCode":"GB"}');
    raise exception 'Duplicate slug was accepted';
  exception when unique_violation then null; end;
  begin
    perform public.update_gym_configuration(created_gym_id,'Claimed Gym','claimed-gym','Europe/London','GB','','','','','','',array['bouldering'],'',false,'#17211B','#D9FF45','#F7F7F2','');
    raise exception 'Another user modified the new gym';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.gym_memberships(gym_id,profile_id,role,status,joined_at)
    values(created_gym_id,auth.uid(),'owner','active',now());
    raise exception 'Another user claimed ownership of the new gym';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
do $$
begin
  perform public.create_my_first_gym('{"name":"Unverified Gym","slug":"unverified-onboarding-gym","countryCode":"GB"}');
  raise exception 'An unverified account created a gym';
exception when insufficient_privilege then null; end;
$$;

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  perform public.create_my_first_gym('{}');
  raise exception 'An anonymous caller invoked self-service gym creation';
exception when insufficient_privilege then null; end;
$$;

rollback;
