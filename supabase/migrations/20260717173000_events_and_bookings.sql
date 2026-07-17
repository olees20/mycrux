-- Prompt 18: rich events, atomic capacity, deterministic waitlists and attendee export.

alter table public.events add column event_type text not null default 'social' check(event_type in ('class','workshop','social','competition','youth','other'));
alter table public.events add column image_path text;
alter table public.events add column organiser_id uuid references public.profiles(id) on delete set null;
alter table public.events add column eligibility jsonb not null default '{"roles":["member","staff","route_setter","owner"]}'::jsonb check(jsonb_typeof(eligibility)='object' and jsonb_typeof(eligibility->'roles')='array');
alter table public.events add column waitlist_enabled boolean not null default true;
alter table public.events add column cancellation_policy text check(cancellation_policy is null or char_length(cancellation_policy)<=2000);
alter table public.events add column cancellation_closes_at timestamptz;
alter table public.events add constraint events_image_path_check check(image_path is null or image_path ~ ('^'||gym_id::text||'/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$'));
alter table public.events add constraint events_booking_deadlines_check check(
  (registration_opens_at is null or registration_opens_at < starts_at)
  and (registration_closes_at is null or registration_closes_at <= starts_at)
  and (cancellation_closes_at is null or cancellation_closes_at <= starts_at)
);
create index event_registrations_waitlist_idx on public.event_registrations(event_id,registered_at,id) where status='waitlisted';

create or replace function private.event_role_eligible(event_row public.events,member_role text)
returns boolean language sql immutable set search_path='' as $$ select (event_row.eligibility->'roles') ? member_role $$;

create or replace function public.register_for_event(target_gym_id uuid,target_event_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare selected public.events; membership public.gym_memberships; existing public.event_registrations; booked integer; next_status text;
begin
  select * into membership from public.gym_memberships where gym_id=target_gym_id and profile_id=auth.uid() and status='active';if membership.id is null then raise exception 'Active membership is required' using errcode='42501';end if;
  select * into selected from public.events where id=target_event_id and gym_id=target_gym_id for update;
  if selected.id is null or selected.status<>'published' or selected.archived_at is not null then raise exception 'Published event was not found' using errcode='22023';end if;
  if selected.registration_opens_at is not null and selected.registration_opens_at>now() then raise exception 'Registration has not opened' using errcode='P0001';end if;
  if selected.registration_closes_at is not null and selected.registration_closes_at<=now() then raise exception 'Registration has closed' using errcode='P0001';end if;
  if selected.starts_at<=now() then raise exception 'Event has already started' using errcode='P0001';end if;
  if not private.event_role_eligible(selected,membership.role) then raise exception 'Membership is not eligible for this event' using errcode='42501';end if;
  select * into existing from public.event_registrations where event_id=selected.id and profile_id=auth.uid() for update;
  if existing.status in ('registered','waitlisted','attended') then raise exception 'You are already registered for this event' using errcode='23505';end if;
  select count(*) into booked from public.event_registrations where event_id=selected.id and status in ('registered','attended');
  if selected.capacity is null or booked<selected.capacity then next_status:='registered';elsif selected.waitlist_enabled then next_status:='waitlisted';else raise exception 'Event is full' using errcode='P0001';end if;
  if existing.id is null then insert into public.event_registrations(gym_id,event_id,profile_id,status) values(target_gym_id,selected.id,auth.uid(),next_status);else update public.event_registrations set status=next_status,registered_at=now(),cancelled_at=null where id=existing.id;end if;
  insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id) values(target_gym_id,auth.uid(),case when next_status='registered' then 'event.booking.confirmed' else 'event.booking.waitlisted' end,case when next_status='registered' then 'Event booking confirmed' else 'You joined the waitlist' end,selected.title,'/g/'||(select slug from public.gyms where id=target_gym_id)||'/app/events/'||selected.id,jsonb_build_object('event_id',selected.id,'status',next_status),selected.id) on conflict(profile_id,notification_type,source_id) where source_id is not null do update set body=excluded.body,payload=excluded.payload,read_at=null,archived_at=null,created_at=now();
  return next_status;
end; $$;

create or replace function public.cancel_event_registration(target_gym_id uuid,target_event_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare selected public.events; registration public.event_registrations; promoted public.event_registrations;
begin
  select * into selected from public.events where id=target_event_id and gym_id=target_gym_id for update;if selected.id is null then raise exception 'Event was not found' using errcode='22023';end if;
  select * into registration from public.event_registrations where event_id=selected.id and profile_id=auth.uid() and status in ('registered','waitlisted') for update;if registration.id is null then raise exception 'Active registration was not found' using errcode='22023';end if;
  if selected.cancellation_closes_at is not null and selected.cancellation_closes_at<=now() then raise exception 'Online cancellation has closed; contact the gym' using errcode='P0001';end if;
  update public.event_registrations set status='cancelled',cancelled_at=now() where id=registration.id;
  if registration.status='registered' then select * into promoted from public.event_registrations where event_id=selected.id and status='waitlisted' order by registered_at,id limit 1 for update skip locked;if promoted.id is not null then update public.event_registrations set status='registered' where id=promoted.id;insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id) values(target_gym_id,promoted.profile_id,'event.waitlist.promoted','You have a place',selected.title,'/g/'||(select slug from public.gyms where id=target_gym_id)||'/app/events/'||selected.id,jsonb_build_object('event_id',selected.id),selected.id) on conflict(profile_id,notification_type,source_id) where source_id is not null do update set read_at=null,archived_at=null,created_at=now();insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata) values(target_gym_id,auth.uid(),'user','event.waitlist.promoted','event_registration',promoted.id,jsonb_build_object('event_id',selected.id));end if;end if;
  return case when promoted.id is null then 'cancelled' else 'promoted' end;
end; $$;

create or replace function public.get_event_availability(target_gym_id uuid,target_event_id uuid)
returns jsonb language plpgsql security definer stable set search_path='' as $$ declare selected public.events;begin if private.current_membership_id(target_gym_id) is null then raise exception 'Active membership is required' using errcode='42501';end if;select * into selected from public.events where id=target_event_id and gym_id=target_gym_id and status='published';if selected.id is null then raise exception 'Event was not found' using errcode='22023';end if;return jsonb_build_object('capacity',selected.capacity,'booked',(select count(*) from public.event_registrations where event_id=selected.id and status in ('registered','attended')),'waitlisted',(select count(*) from public.event_registrations where event_id=selected.id and status='waitlisted'));end;$$;

create or replace function private.event_notification_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare gym_slug text; notification_kind text;
begin
  select slug into gym_slug from public.gyms where id=new.gym_id;
  if tg_op='UPDATE' and old.status is distinct from new.status and new.status='cancelled' then
    insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id)
    select new.gym_id,registration.profile_id,'event.cancelled',new.title,'This event has been cancelled.','/g/'||gym_slug||'/app/events',jsonb_build_object('event_id',new.id),new.id
    from public.event_registrations registration
    where registration.event_id=new.id and registration.profile_id is not null and registration.status in ('registered','waitlisted')
    on conflict(profile_id,notification_type,source_id) where source_id is not null do update set body=excluded.body,read_at=null,archived_at=null,created_at=now();
    return new;
  end if;
  if new.status<>'published' then return new; end if;
  if tg_op='INSERT' then notification_kind:='event.published';
  elsif old.title is not distinct from new.title and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at and old.location is not distinct from new.location and old.status is not distinct from new.status then return new;
  else notification_kind:='event.changed'; end if;
  insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id)
  select new.gym_id,membership.profile_id,notification_kind,new.title,case when notification_kind='event.changed' then 'Event details have changed.' else 'A new event is available.' end,'/g/'||gym_slug||'/app/events/'||new.id,jsonb_build_object('event_id',new.id),case when notification_kind='event.published' then new.id else null end
  from public.gym_memberships membership left join public.notification_preferences preference on preference.gym_id=membership.gym_id and preference.profile_id=membership.profile_id
  where membership.gym_id=new.gym_id and membership.status='active' and coalesce(preference.events_enabled,true)
  on conflict(profile_id,notification_type,source_id) where source_id is not null do nothing;
  return new;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('event-images','event-images',false,10485760,array['image/png','image/jpeg','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy event_image_objects_select on storage.objects for select to authenticated using(bucket_id='event-images' and private.current_membership_id((storage.foldername(name))[1]::uuid) is not null);
create policy event_image_objects_insert on storage.objects for insert to authenticated with check(bucket_id='event-images' and private.has_gym_capability((storage.foldername(name))[1]::uuid,'events.manage'));
create policy event_image_objects_delete on storage.objects for delete to authenticated using(bucket_id='event-images' and private.has_gym_capability((storage.foldername(name))[1]::uuid,'events.manage'));

drop policy event_registrations_insert_self on public.event_registrations;drop policy event_registrations_update_allowed on public.event_registrations;drop policy event_registrations_delete_self on public.event_registrations;
revoke insert,update,delete on public.event_registrations from authenticated;
revoke all on function public.register_for_event(uuid,uuid) from public,anon;revoke all on function public.cancel_event_registration(uuid,uuid) from public,anon;revoke all on function public.get_event_availability(uuid,uuid) from public,anon;
grant execute on function public.register_for_event(uuid,uuid) to authenticated,service_role;grant execute on function public.cancel_event_registration(uuid,uuid) to authenticated,service_role;grant execute on function public.get_event_availability(uuid,uuid) to authenticated,service_role;
