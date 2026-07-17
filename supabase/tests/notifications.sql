-- Prompt 11 scheduling, audience, generation, read-state, and preference tests.
begin;

insert into public.announcements(id,gym_id,author_id,title,body,status,audience,priority,published_at,expires_at,is_pinned) values
('82000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Current members','Current body','published','members','important',now()-interval '1 minute',now()+interval '1 day',true),
('82000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Scheduled members','Scheduled body','published','members','normal',now()+interval '1 day',now()+interval '2 days',false),
('82000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Expired members','Expired body','published','members','normal',now()-interval '2 days',now()-interval '1 day',false),
('82000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Staff only','Staff body','published','staff','urgent',now()-interval '1 minute',now()+interval '1 day',false);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$
begin
  if not exists(select 1 from public.announcements where id='82000000-0000-4000-8000-000000000001') then raise exception 'Current member announcement is hidden'; end if;
  if exists(select 1 from public.announcements where id in ('82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000004')) then raise exception 'Scheduled, expired, or staff announcement leaked to member'; end if;
  if not exists(select 1 from public.notifications where source_id='82000000-0000-4000-8000-000000000001' and notification_type='announcement.published') then raise exception 'Current announcement notification missing'; end if;
  if exists(select 1 from public.notifications where source_id in ('82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000004')) then raise exception 'Ineligible announcement notification leaked to member'; end if;
end; $$;

insert into public.notification_preferences(gym_id,profile_id,announcements_enabled)
values('30000000-0000-4000-8000-000000000001',auth.uid(),false)
on conflict(gym_id,profile_id) do update set announcements_enabled=false;

update public.notifications set read_at=now() where source_id='82000000-0000-4000-8000-000000000001';
do $$ begin if not exists(select 1 from public.notifications where source_id='82000000-0000-4000-8000-000000000001' and read_at is not null) then raise exception 'Read state did not persist'; end if; end $$;

set local role service_role;
insert into public.announcements(id,gym_id,author_id,title,body,status,audience,published_at) values
('82000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Preference test','Body','published','members',now());
update public.announcements set published_at=now()-interval '1 minute' where id='82000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.role','service_role',true);
select public.process_due_announcements();
select public.process_due_announcements();

insert into public.events(id,gym_id,created_by,title,starts_at,ends_at,status,visibility,published_at)
values('83000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test social',now()+interval '2 days',now()+interval '2 days 2 hours','published','members',now());
update public.events set starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour' where id='83000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin if not exists(select 1 from public.announcements where id='82000000-0000-4000-8000-000000000004') then raise exception 'Staff audience is hidden from staff'; end if; end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$
begin
  if exists(select 1 from public.notifications where source_id='82000000-0000-4000-8000-000000000005') then raise exception 'Announcement preference opt-out was ignored'; end if;
end; $$;

set local role service_role;
do $$
begin
  if (select count(*) from public.notifications where profile_id='10000000-0000-4000-8000-000000000001' and source_id='82000000-0000-4000-8000-000000000002' and notification_type='announcement.published') <> 1 then raise exception 'Due processor was not idempotent'; end if;
  if not exists(select 1 from public.notifications where source_id='83000000-0000-4000-8000-000000000001' and notification_type='event.published')
    or not exists(select 1 from public.notifications where payload->>'event_id'='83000000-0000-4000-8000-000000000001' and notification_type='event.changed') then raise exception 'Event notification generation is incomplete'; end if;
end; $$;

rollback;
