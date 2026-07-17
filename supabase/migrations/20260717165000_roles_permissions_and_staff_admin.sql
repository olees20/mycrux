-- Prompt 8: canonical staff roles and audited access administration.

-- Preserve the seeded IDs while moving legacy labels to the canonical role keys.
update public.staff_roles
set key = 'front_desk',
    name = 'Front desk',
    description = 'Reception, guest, waiver, pass, and event operations.',
    capabilities = array['events.manage', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage']
where key = 'operations'
  and not exists (
    select 1 from public.staff_roles existing
    where existing.gym_id = staff_roles.gym_id and existing.key = 'front_desk'
  );

update public.staff_roles
set key = 'route_setter',
    name = 'Route setter',
    description = 'Walls, routes, feedback, and competition scoring.',
    capabilities = array['walls.read', 'routes.manage', 'route_feedback.read', 'competitions.score']
where key = 'route_setting'
  and not exists (
    select 1 from public.staff_roles existing
    where existing.gym_id = staff_roles.gym_id and existing.key = 'route_setter'
  );

create or replace function private.provision_system_staff_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff_roles (gym_id, key, name, description, capabilities, is_system)
  values
    (new.id, 'gym_manager', 'Gym manager', 'Day-to-day gym administration and standard staff access.',
      array['staff.manage', 'announcements.manage', 'events.manage', 'routes.manage', 'route_feedback.read', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage', 'competitions.manage', 'competitions.score', 'community.moderate', 'chat.manage'], true),
    (new.id, 'route_setter', 'Route setter', 'Walls, routes, feedback, and competition scoring.',
      array['walls.read', 'routes.manage', 'route_feedback.read', 'competitions.score'], true),
    (new.id, 'front_desk', 'Front desk', 'Reception, guest, waiver, pass, and event operations.',
      array['events.manage', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage'], true),
    (new.id, 'moderator', 'Moderator', 'Community and chat moderation.',
      array['community.moderate', 'chat.manage', 'route_feedback.read'], true)
  on conflict (gym_id, key) do update
  set name = excluded.name,
      description = excluded.description,
      capabilities = excluded.capabilities,
      is_system = true,
      archived_at = null;
  return new;
end;
$$;

revoke all on function private.provision_system_staff_roles() from public, anon, authenticated;

insert into public.staff_roles (gym_id, key, name, description, capabilities, is_system)
select gym.id, role.key, role.name, role.description, role.capabilities, true
from public.gyms gym
cross join lateral (
  values
    ('gym_manager', 'Gym manager', 'Day-to-day gym administration and standard staff access.',
      array['staff.manage', 'announcements.manage', 'events.manage', 'routes.manage', 'route_feedback.read', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage', 'competitions.manage', 'competitions.score', 'community.moderate', 'chat.manage']::text[]),
    ('route_setter', 'Route setter', 'Walls, routes, feedback, and competition scoring.',
      array['walls.read', 'routes.manage', 'route_feedback.read', 'competitions.score']::text[]),
    ('front_desk', 'Front desk', 'Reception, guest, waiver, pass, and event operations.',
      array['events.manage', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage']::text[]),
    ('moderator', 'Moderator', 'Community and chat moderation.',
      array['community.moderate', 'chat.manage', 'route_feedback.read']::text[])
) as role(key, name, description, capabilities)
on conflict (gym_id, key) do update
set name = excluded.name,
    description = excluded.description,
    capabilities = excluded.capabilities,
    is_system = true,
    archived_at = null;

-- The trigger provisions the same immutable system bundles for future gyms.
drop trigger if exists provision_gym_system_staff_roles on public.gyms;
create trigger provision_gym_system_staff_roles
after insert on public.gyms
for each row execute function private.provision_system_staff_roles();

create or replace function private.can_manage_staff(target_gym_id uuid, target_role_key text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_gym_role(target_gym_id, array['owner'])
    or (
      private.has_gym_capability(target_gym_id, 'staff.manage')
      and (target_role_key is null or target_role_key = any(array['route_setter', 'front_desk', 'moderator']))
    );
$$;

revoke all on function private.can_manage_staff(uuid, text) from public, anon, authenticated;

create or replace function public.create_staff_invitation(
  target_gym_id uuid,
  invite_email text,
  target_role_key text,
  invitation_token_hash text,
  invitation_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  selected_role public.staff_roles%rowtype;
  invitation_id uuid;
  membership_role text;
begin
  if actor_id is null or not private.is_current_email_verified() then
    raise exception 'A verified account is required' using errcode = '28000';
  end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '30 days' then
    raise exception 'Invitation token or expiry is invalid' using errcode = '22023';
  end if;
  if lower(trim(invite_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(trim(invite_email)) > 320 then
    raise exception 'Invitation email is invalid' using errcode = '22023';
  end if;

  select role.* into selected_role
  from public.staff_roles role
  where role.gym_id = target_gym_id
    and role.key = target_role_key
    and role.is_system
    and role.archived_at is null;

  if not found or not private.can_manage_staff(target_gym_id, selected_role.key) then
    raise exception 'Staff role assignment is not permitted' using errcode = '42501';
  end if;

  membership_role := case when selected_role.key = 'route_setter' then 'route_setter' else 'staff' end;
  insert into public.invitations (
    gym_id, email, token_hash, role, staff_role_id, invited_by, expires_at
  ) values (
    target_gym_id, lower(trim(invite_email)), invitation_token_hash,
    membership_role, selected_role.id, actor_id, invitation_expires_at
  ) returning id into invitation_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, actor_id, 'user', 'staff.invitation.created', 'invitation', invitation_id,
    jsonb_build_object('role', selected_role.key, 'expires_at', invitation_expires_at)
  );
  return invitation_id;
end;
$$;

create or replace function public.resend_staff_invitation(
  target_invitation_id uuid,
  invitation_token_hash text,
  invitation_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  invitation public.invitations%rowtype;
  role_key text;
begin
  if actor_id is null or not private.is_current_email_verified() then
    raise exception 'A verified account is required' using errcode = '28000';
  end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '30 days' then
    raise exception 'Invitation token or expiry is invalid' using errcode = '22023';
  end if;

  select item.* into invitation
  from public.invitations item
  where item.id = target_invitation_id
  for update of item;

  select role.key into role_key
  from public.staff_roles role
  where role.id = invitation.staff_role_id and role.gym_id = invitation.gym_id;

  if not found or invitation.status <> 'pending'
    or not private.can_manage_staff(invitation.gym_id, role_key) then
    raise exception 'Invitation cannot be resent' using errcode = '42501';
  end if;

  update public.invitations
  set token_hash = invitation_token_hash, expires_at = invitation_expires_at
  where id = invitation.id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    invitation.gym_id, actor_id, 'user', 'staff.invitation.resent', 'invitation', invitation.id,
    jsonb_build_object('role', role_key, 'expires_at', invitation_expires_at)
  );
  return invitation.id;
end;
$$;

create or replace function public.revoke_staff_invitation(target_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  invitation public.invitations%rowtype;
  role_key text;
begin
  select item.* into invitation
  from public.invitations item
  where item.id = target_invitation_id
  for update of item;

  select role.key into role_key
  from public.staff_roles role
  where role.id = invitation.staff_role_id and role.gym_id = invitation.gym_id;

  if actor_id is null or not found or invitation.status <> 'pending'
    or not private.can_manage_staff(invitation.gym_id, role_key) then
    raise exception 'Invitation cannot be revoked' using errcode = '42501';
  end if;

  update public.invitations
  set status = 'revoked', revoked_at = now()
  where id = invitation.id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    invitation.gym_id, actor_id, 'user', 'staff.invitation.revoked', 'invitation', invitation.id,
    jsonb_build_object('role', role_key)
  );
  return invitation.id;
end;
$$;

create or replace function public.update_staff_access(
  target_membership_id uuid,
  target_role_key text,
  target_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  membership public.gym_memberships%rowtype;
  old_role_key text;
  selected_role public.staff_roles%rowtype;
  membership_role text;
begin
  if target_status not in ('active', 'suspended', 'left') then
    raise exception 'Membership status is invalid' using errcode = '22023';
  end if;

  select item.* into membership
  from public.gym_memberships item
  where item.id = target_membership_id
  for update of item;

  select role.key into old_role_key
  from public.staff_roles role
  where role.id = membership.staff_role_id and role.gym_id = membership.gym_id;

  select role.* into selected_role
  from public.staff_roles role
  where role.gym_id = membership.gym_id
    and role.key = target_role_key
    and role.is_system
    and role.archived_at is null;

  if actor_id is null or not found
    or membership.profile_id = actor_id
    or membership.role not in ('staff', 'route_setter')
    or not private.can_manage_staff(membership.gym_id, old_role_key)
    or not private.can_manage_staff(membership.gym_id, selected_role.key) then
    raise exception 'Staff access change is not permitted' using errcode = '42501';
  end if;

  membership_role := case when selected_role.key = 'route_setter' then 'route_setter' else 'staff' end;
  update public.gym_memberships
  set role = membership_role,
      staff_role_id = selected_role.id,
      status = target_status,
      joined_at = case when target_status = 'active' then coalesce(joined_at, now()) else joined_at end,
      suspended_at = case when target_status = 'suspended' then now() else null end,
      left_at = case when target_status = 'left' then now() else null end
  where id = membership.id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    membership.gym_id, actor_id, 'user', 'staff.access.updated', 'gym_membership', membership.id,
    jsonb_build_object(
      'old_role', old_role_key, 'new_role', selected_role.key,
      'old_status', membership.status, 'new_status', target_status
    )
  );
  return membership.id;
end;
$$;

-- Invitation acceptance is already atomic; this trigger records its access grant without storing the token.
create or replace function private.audit_invitation_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.audit_logs (
      gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
    ) values (
      new.gym_id, new.accepted_by, 'user', 'staff.invitation.accepted', 'invitation', new.id,
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_invitation_acceptance on public.invitations;
create trigger audit_invitation_acceptance
after update on public.invitations
for each row execute function private.audit_invitation_acceptance();

drop policy if exists invitations_select_owner on public.invitations;
create policy invitations_select_staff_manager on public.invitations
for select to authenticated
using (private.can_manage_staff(gym_id));

drop policy if exists invitations_insert_owner on public.invitations;
drop policy if exists invitations_update_owner on public.invitations;
drop policy if exists invitations_delete_owner on public.invitations;
revoke insert, update, delete on public.invitations from authenticated;

-- Active access changes must use the audited RPCs. The constrained public-join insert
-- policy remains available and can create only a non-active member request.
drop policy if exists gym_memberships_insert_owner on public.gym_memberships;
drop policy if exists gym_memberships_update_owner on public.gym_memberships;
drop policy if exists gym_memberships_delete_owner on public.gym_memberships;

revoke all on function public.create_staff_invitation(uuid, text, text, text, timestamptz) from public, anon;
revoke all on function public.resend_staff_invitation(uuid, text, timestamptz) from public, anon;
revoke all on function public.revoke_staff_invitation(uuid) from public, anon;
revoke all on function public.update_staff_access(uuid, text, text) from public, anon;
grant execute on function public.create_staff_invitation(uuid, text, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.resend_staff_invitation(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.revoke_staff_invitation(uuid) to authenticated, service_role;
grant execute on function public.update_staff_access(uuid, text, text) to authenticated, service_role;

comment on function public.create_staff_invitation(uuid, text, text, text, timestamptz) is
  'Creates a hashed, expiring staff invitation after owner/manager role-boundary checks and appends an audit event.';
comment on function public.update_staff_access(uuid, text, text) is
  'Atomically changes non-owner staff role/status within the actor permission boundary and appends an audit event.';
