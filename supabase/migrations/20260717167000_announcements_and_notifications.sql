-- Prompt 11: scheduled announcements and idempotent in-app notification generation.

alter table public.announcements
  add column priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  add column expires_at timestamptz,
  add column is_pinned boolean not null default false,
  add constraint announcements_schedule_check check (expires_at is null or published_at is null or expires_at > published_at);

create index announcements_current_idx on public.announcements(gym_id, priority, published_at desc)
where status='published' and archived_at is null;

alter table public.notifications add column source_id uuid;
create unique index notifications_source_recipient_key
on public.notifications(profile_id,notification_type,source_id)
where source_id is not null;

create trigger protect_notification_source_id before update on public.notifications
for each row execute function private.prevent_protected_column_changes('source_id');

alter table public.notification_preferences add column announcements_enabled boolean not null default true;

drop policy if exists announcements_select_published on public.announcements;
create policy announcements_select_current on public.announcements for select to authenticated using (
  private.has_gym_capability(gym_id,'announcements.manage')
  or (
    private.current_membership_id(gym_id) is not null
    and status='published' and archived_at is null
    and published_at <= now() and (expires_at is null or expires_at > now())
    and (audience in ('public','members') or private.has_gym_role(gym_id,array['owner','staff','route_setter']))
  )
);

create or replace function private.notify_announcement(target_announcement_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare item public.announcements%rowtype; gym_slug text;
begin
  select * into item from public.announcements where id=target_announcement_id;
  if not found or item.status<>'published' or item.archived_at is not null or item.published_at>now() or (item.expires_at is not null and item.expires_at<=now()) then return; end if;
  select slug into gym_slug from public.gyms where id=item.gym_id;
  insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id)
  select item.gym_id,membership.profile_id,'announcement.published',item.title,left(item.body,1000),'/g/'||gym_slug||'/app/announcements',jsonb_build_object('priority',item.priority),item.id
  from public.gym_memberships membership
  left join public.notification_preferences preference on preference.gym_id=membership.gym_id and preference.profile_id=membership.profile_id
  where membership.gym_id=item.gym_id and membership.status='active'
    and coalesce(preference.announcements_enabled,true)
    and (item.audience in ('public','members') or membership.role in ('owner','staff','route_setter'))
  on conflict(profile_id,notification_type,source_id) where source_id is not null do nothing;
end; $$;

create or replace function private.announcement_notification_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.notify_announcement(new.id); return new; end; $$;
create trigger generate_announcement_notifications after insert or update of status,published_at,expires_at,title,body,audience on public.announcements
for each row execute function private.announcement_notification_trigger();

create or replace function public.process_due_announcements()
returns integer language plpgsql security definer set search_path='' as $$
declare item record; processed integer:=0;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role is required' using errcode='42501'; end if;
  for item in select id from public.announcements where status='published' and archived_at is null and published_at<=now() and (expires_at is null or expires_at>now()) loop
    perform private.notify_announcement(item.id); processed:=processed+1;
  end loop;
  return processed;
end; $$;

create or replace function private.event_notification_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare gym_slug text; event_type text;
begin
  if new.status<>'published' then return new; end if;
  if tg_op='INSERT' then event_type:='event.published';
  elsif old.title is not distinct from new.title and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at and old.location is not distinct from new.location and old.status is not distinct from new.status then return new;
  else event_type:='event.changed'; end if;
  select slug into gym_slug from public.gyms where id=new.gym_id;
  insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id)
  select new.gym_id,membership.profile_id,event_type,new.title,case when event_type='event.changed' then 'Event details have changed.' else 'A new event is available.' end,'/g/'||gym_slug||'/app/events',jsonb_build_object('event_id',new.id),case when event_type='event.published' then new.id else null end
  from public.gym_memberships membership left join public.notification_preferences preference on preference.gym_id=membership.gym_id and preference.profile_id=membership.profile_id
  where membership.gym_id=new.gym_id and membership.status='active' and coalesce(preference.events_enabled,true)
  on conflict(profile_id,notification_type,source_id) where source_id is not null do nothing;
  return new;
end; $$;
create trigger generate_event_notifications after insert or update of title,starts_at,ends_at,location,status on public.events
for each row execute function private.event_notification_trigger();

create or replace function private.invitation_notification_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare gym_slug text; notification_kind text;
begin
  if tg_op='INSERT' then notification_kind:='invitation.created';
  elsif old.status is not distinct from new.status then return new;
  else notification_kind:='invitation.'||new.status; end if;
  select slug into gym_slug from public.gyms where id=new.gym_id;
  insert into public.notifications(gym_id,profile_id,notification_type,title,body,link_path,payload,source_id)
  select new.gym_id,membership.profile_id,notification_kind,'Invitation update','A gym invitation is now '||new.status||'.','/g/'||gym_slug||'/staff/team','{}',new.id
  from public.gym_memberships membership left join public.staff_roles role on role.id=membership.staff_role_id
  where membership.gym_id=new.gym_id and membership.status='active' and (membership.role='owner' or role.key='gym_manager')
  on conflict(profile_id,notification_type,source_id) where source_id is not null do nothing;
  return new;
end; $$;
create trigger generate_invitation_notifications after insert or update of status on public.invitations
for each row execute function private.invitation_notification_trigger();

revoke all on function public.process_due_announcements() from public,anon,authenticated;
grant execute on function public.process_due_announcements() to service_role;
