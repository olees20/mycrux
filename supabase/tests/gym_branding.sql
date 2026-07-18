-- Prompt 9 gym creation, configuration, branding, slug, and Storage boundaries.
begin;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select public.create_gym_tenant(
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000005',
  '{"name":"North Test Wall","slug":"north-test-wall","timezone":"Europe/London","countryCode":"GB","addressLine1":"1 Test Street","addressLine2":"","city":"Leeds","postcode":"LS1 1AA","contactEmail":"hello@north.example.invalid","contactPhone":"","disciplines":["bouldering","training"],"openingHoursText":"Daily 07:00–22:00","publicJoinRequestsEnabled":true}'::jsonb,
  '{"primaryColour":"#17211B","accentColour":"#D9FF45","backgroundColour":"#F7F7F2","welcomeMessage":"Welcome north"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

do $$
#variable_conflict use_variable
declare gym_id uuid;
begin
  select id into gym_id from public.gyms where slug='north-test-wall';
  if not exists(select 1 from public.gym_memberships membership where membership.gym_id=gym_id and profile_id=auth.uid() and role='owner' and status='active') then raise exception 'Creation did not assign the owner'; end if;
  if (select count(*) from public.staff_roles role where role.gym_id=gym_id and is_system) <> 4 then raise exception 'Creation did not provision canonical staff roles'; end if;
  perform public.update_gym_configuration(gym_id,'North Test Wall','north-test-centre','Europe/London','GB','1 Test Street','','Leeds','LS1 1AA','hello@north.example.invalid','',array['bouldering'],'Daily 07:00–22:00',true,'#17211B','#D9FF45','#F7F7F2','Updated welcome');
  if not exists(select 1 from public.gym_slug_history history where history.gym_id=gym_id and previous_slug='north-test-wall' and changed_to_slug='north-test-centre') then raise exception 'Slug change was not recorded'; end if;
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('gym-branding',gym_id::text || '/11111111-1111-4111-8111-111111111111.webp',auth.uid()::text,'{"mimetype":"image/webp","size":4}');
  perform public.set_gym_logo_path(gym_id, gym_id::text || '/11111111-1111-4111-8111-111111111111.webp');
  begin
    perform public.update_gym_configuration(gym_id,'North Test Wall','admin','Europe/London','GB','1 Test Street','','Leeds','LS1 1AA','hello@north.example.invalid','',array['bouldering'],'Daily',true,'#17211B','#D9FF45','#F7F7F2','Welcome');
    raise exception 'Reserved slug was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_gym_configuration(gym_id,'North Test Wall','north-test-centre','Europe/London','GB','1 Test Street','','Leeds','LS1 1AA','hello@north.example.invalid','',array['bouldering'],'Daily',true,'#777777','#D9FF45','#888888','Welcome');
    raise exception 'Low contrast palette was accepted';
  exception when invalid_parameter_value then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
do $$
#variable_conflict use_variable
declare gym_id uuid;
begin
  select id into gym_id from public.gyms where slug='north-test-centre';
  begin
    perform public.update_gym_configuration(gym_id,'Hijack','north-test-centre','Europe/London','GB','X','','X','X','x@example.invalid','',array['bouldering'],'Daily',false,'#17211B','#D9FF45','#F7F7F2','X');
    raise exception 'Non-owner updated gym configuration';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name,owner_id) values('gym-branding',gym_id::text || '/22222222-2222-4222-8222-222222222222.webp',auth.uid()::text);
    raise exception 'Non-owner uploaded another tenant logo';
  exception when insufficient_privilege then null; end;
end;
$$;

set local role service_role;
do $$
begin
  if not exists(select 1 from public.audit_logs where action='gym.created')
    or not exists(select 1 from public.audit_logs where action='gym.configuration.updated')
    or not exists(select 1 from public.audit_logs where action='gym.logo.updated') then raise exception 'Gym lifecycle audit events are incomplete'; end if;
end;
$$;
rollback;
