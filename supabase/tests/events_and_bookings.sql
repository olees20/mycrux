-- Prompt 18 atomic event booking, deterministic waitlists, notifications and RLS.
begin;

set local role service_role;
insert into public.events(id,gym_id,created_by,event_type,title,description,location,organiser_id,starts_at,ends_at,capacity,status,registration_opens_at,registration_closes_at,cancellation_policy,waitlist_enabled,eligibility,published_at)
values('86000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','workshop','Atomic booking workshop','Capacity and waitlist test','Training room','10000000-0000-4000-8000-000000000002',now()+interval '2 days',now()+interval '2 days 2 hours',1,'published',now()-interval '1 hour',now()+interval '1 day','Cancel online until the deadline.',true,'{"roles":["member","staff","route_setter","owner"]}'::jsonb,now());

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
  if public.register_for_event('30000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001') <> 'registered' then raise exception 'First booking was not confirmed'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  if public.register_for_event('30000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001') <> 'waitlisted' then raise exception 'Second booking was not waitlisted'; end if;
  begin
    insert into public.event_registrations(gym_id,event_id,profile_id,status) values('30000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001',auth.uid(),'registered');
    raise exception 'Direct capacity bypass succeeded';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select public.register_for_event('30000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001');

set local role service_role;
create temp table expected_promotion as
select id,profile_id from public.event_registrations where event_id='86000000-0000-4000-8000-000000000001' and status='waitlisted' order by registered_at,id limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.cancel_event_registration('30000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001');

set local role service_role;
do $$ declare promoted_profile uuid; begin
  if (select count(*) from public.event_registrations where event_id='86000000-0000-4000-8000-000000000001' and status in ('registered','attended')) > 1 then raise exception 'Capacity was exceeded'; end if;
  select profile_id into promoted_profile from public.event_registrations where event_id='86000000-0000-4000-8000-000000000001' and status='registered';
  if promoted_profile is distinct from (select profile_id from expected_promotion) then raise exception 'Waitlist promotion was not deterministic'; end if;
  if not exists(select 1 from public.audit_logs where action='event.waitlist.promoted' and target_id=(select id from expected_promotion)) then raise exception 'Promotion audit is missing'; end if;
  if not exists(select 1 from public.notifications where profile_id=promoted_profile and notification_type='event.waitlist.promoted' and source_id='86000000-0000-4000-8000-000000000001') then raise exception 'Promotion notification is missing'; end if;
end $$;

update public.events set status='cancelled' where id='86000000-0000-4000-8000-000000000001';
do $$ begin
  if not exists(select 1 from public.notifications where notification_type='event.cancelled' and source_id='86000000-0000-4000-8000-000000000001') then raise exception 'Cancellation notification is missing'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  if exists(select 1 from public.event_registrations where profile_id is distinct from auth.uid()) then raise exception 'Member saw another attendee'; end if;
end $$;

rollback;
