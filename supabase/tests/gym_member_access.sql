-- QR/manual member access is authenticated, member-only, rotatable and rate limited.
begin;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000094','qr-joiner@crux.example.invalid',null,'{"display_name":"QR Joiner"}'),
  ('10000000-0000-4000-8000-000000000095','code-joiner@crux.example.invalid',null,'{"display_name":"Code Joiner"}'),
  ('10000000-0000-4000-8000-000000000096','rotation-joiner@crux.example.invalid',null,'{"display_name":"Rotation Joiner"}'),
  ('10000000-0000-4000-8000-000000000097','limited-joiner@crux.example.invalid',null,'{"display_name":"Limited Joiner"}');

select set_config('test.join_identifier', join_identifier::text, true),
       set_config('test.join_code', join_code, true)
from public.gym_join_credentials
where gym_id = '30000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000094',true);

do $$
declare membership_id uuid;
begin
  membership_id := public.join_gym_as_member(current_setting('test.join_identifier'), 'qr');
  perform public.join_gym_as_member(current_setting('test.join_identifier'), 'qr');
  if (select count(*) from public.gym_memberships where gym_id='30000000-0000-4000-8000-000000000001' and profile_id=auth.uid()) <> 1 then
    raise exception 'QR joining created duplicate memberships';
  end if;
  if not exists (select 1 from public.gym_memberships where id=membership_id and role='member' and staff_role_id is null and status='active') then
    raise exception 'QR joining assigned something other than standard member access';
  end if;
  if (select count(*) from public.audit_logs where target_id=membership_id and action='membership.join_code.joined') <> 1 then
    raise exception 'QR member creation was not audited exactly once';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000095',true);
do $$
declare status record; membership_id uuid;
begin
  select * into status from public.get_gym_join_status(lower(current_setting('test.join_code')), 'code');
  if status.state <> 'valid' or status.gym_name is null then raise exception 'Manual code did not resolve'; end if;
  membership_id := public.join_gym_as_member(lower(current_setting('test.join_code')), 'code');
  if not exists (select 1 from public.gym_memberships where id=membership_id and role='member' and status='active') then
    raise exception 'Manual code did not create member access';
  end if;
end;
$$;

-- Only an authorised manager can disable or rotate current credentials.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000094',true);
do $$ begin
  begin
    perform public.rotate_gym_join_credentials('30000000-0000-4000-8000-000000000001');
    raise exception 'Ordinary member rotated gym access';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.set_gym_join_enabled('30000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000096',true);
do $$
declare status record;
begin
  select * into status from public.get_gym_join_status(current_setting('test.join_identifier'), 'qr');
  if status.state <> 'disabled' then raise exception 'Disabled gym access did not report disabled'; end if;
  begin
    perform public.join_gym_as_member(current_setting('test.join_identifier'), 'qr');
    raise exception 'Disabled gym access created a membership';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.set_gym_join_enabled('30000000-0000-4000-8000-000000000001', true);
select * from public.rotate_gym_join_credentials('30000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000096',true);
do $$
declare qr_status record; code_status record;
begin
  select * into qr_status from public.get_gym_join_status(current_setting('test.join_identifier'), 'qr');
  select * into code_status from public.get_gym_join_status(current_setting('test.join_code'), 'code');
  if qr_status.state <> 'rotated' or code_status.state <> 'rotated' then
    raise exception 'Rotated credentials did not invalidate both old access methods';
  end if;
end $$;

-- Archived gyms cannot be joined even with the current identifier.
set local role service_role;
update public.gyms set archived_at=now() where id='30000000-0000-4000-8000-000000000001';
select set_config('test.current_identifier',(select join_identifier::text from public.gym_join_credentials where gym_id='30000000-0000-4000-8000-000000000001'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000096',true);
do $$ declare status record; begin
  select * into status from public.get_gym_join_status(current_setting('test.current_identifier'),'qr');
  if status.state <> 'unavailable' then raise exception 'Archived gym remained joinable'; end if;
end $$;
set local role service_role;
update public.gyms set archived_at=null where id='30000000-0000-4000-8000-000000000001';

-- Direct authenticated callers receive the same database-enforced attempt limit.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000097',true);
do $$
declare attempt integer; status record;
begin
  select * into status from public.get_gym_join_status('ZZZZZZZZ','code');
  if status.state <> 'invalid' then raise exception 'Invalid manual code did not report invalid'; end if;
  for attempt in 1..19 loop perform public.get_gym_join_status('ZZZZZZZZ','code'); end loop;
  begin
    perform public.get_gym_join_status('ZZZZZZZZ','code');
    raise exception 'Manual-code rate limit was not enforced';
  exception when raise_exception then
    if sqlerrm not like 'Too many gym code attempts%' then raise; end if;
  end;
end $$;

-- Anonymous callers cannot resolve or consume credentials.
set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform public.join_gym_as_member(current_setting('test.current_identifier'),'qr');
    raise exception 'Anonymous caller joined a gym';
  exception when invalid_authorization_specification then null; end;
end $$;

rollback;
