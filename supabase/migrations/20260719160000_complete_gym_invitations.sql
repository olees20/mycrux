-- Complete the email-bound, single-use gym invitation lifecycle.

-- The earlier policy called a private helper whose EXECUTE privilege is intentionally
-- revoked from authenticated users. Use the granted tenant predicates directly.
drop policy invitations_select_staff_manager on public.invitations;
create policy invitations_select_authorised_staff on public.invitations
for select to authenticated
using (
  private.has_gym_role(gym_id, array['owner'])
  or private.has_gym_capability(gym_id, 'staff.manage')
);

create or replace function public.get_gym_invitation_status(invitation_token_hash text)
returns table(
  state text,
  gym_id uuid,
  gym_slug text,
  gym_name text,
  invitation_role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  invitation public.invitations%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  select lower(email) into actor_email
  from auth.users
  where id = actor_id and email_confirmed_at is not null;
  if actor_email is null then
    raise exception 'A verified email address is required' using errcode = '28000';
  end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    return query select 'invalid'::text, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  select item.* into invitation
  from public.invitations item
  where item.token_hash = invitation_token_hash;
  if not found then
    return query select 'invalid'::text, null::uuid, null::text, null::text, null::text;
    return;
  end if;

  return query
  select
    case
      when invitation.status = 'accepted' then 'used'
      when invitation.status = 'revoked' then 'revoked'
      when invitation.status = 'expired' or invitation.expires_at <= now() then 'expired'
      when lower(invitation.email) <> actor_email then 'wrong_email'
      else 'valid'
    end,
    gym.id,
    gym.slug,
    gym.name,
    invitation.role
  from public.gyms gym
  where gym.id = invitation.gym_id;
end;
$$;

create or replace function public.accept_gym_invitation(invitation_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  matched_invitation public.invitations%rowtype;
  existing_membership public.gym_memberships%rowtype;
  accepted_membership_id uuid;
  assigned_role text;
  assigned_staff_role_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invitation is invalid' using errcode = '22023';
  end if;
  select lower(email) into current_email
  from auth.users
  where id = current_user_id and email_confirmed_at is not null;
  if current_email is null then
    raise exception 'A verified email address is required' using errcode = '28000';
  end if;

  select invitation.* into matched_invitation
  from public.invitations invitation
  where invitation.token_hash = invitation_token_hash
  for update;

  if not found then
    raise exception 'Invitation is invalid' using errcode = '22023';
  elsif matched_invitation.status = 'accepted' then
    raise exception 'Invitation has already been used' using errcode = '42501';
  elsif matched_invitation.status = 'revoked' then
    raise exception 'Invitation has been revoked' using errcode = 'P0001';
  elsif matched_invitation.status = 'expired' or matched_invitation.expires_at <= now() then
    raise exception 'Invitation has expired' using errcode = 'P0001';
  elsif matched_invitation.status <> 'pending' then
    raise exception 'Invitation is invalid' using errcode = '22023';
  elsif lower(matched_invitation.email) <> current_email then
    raise exception 'Invitation belongs to another email address' using errcode = '42501';
  end if;

  select membership.* into existing_membership
  from public.gym_memberships membership
  where membership.gym_id = matched_invitation.gym_id
    and membership.profile_id = current_user_id
  for update;

  assigned_role := matched_invitation.role;
  assigned_staff_role_id := matched_invitation.staff_role_id;
  if found and existing_membership.status = 'active'
    and (
      existing_membership.role = 'owner'
      or (matched_invitation.role = 'member' and existing_membership.role in ('staff','route_setter'))
    ) then
    assigned_role := existing_membership.role;
    assigned_staff_role_id := existing_membership.staff_role_id;
  end if;

  if found and existing_membership.status in ('suspended','left') then
    raise exception 'Existing membership state cannot accept this invitation' using errcode = '42501';
  elsif found then
    update public.gym_memberships
    set role = assigned_role,
        staff_role_id = assigned_staff_role_id,
        status = 'active',
        joined_at = coalesce(joined_at, now()),
        suspended_at = null,
        left_at = null
    where id = existing_membership.id
    returning id into accepted_membership_id;
  else
    insert into public.gym_memberships (
      gym_id, profile_id, role, staff_role_id, status, joined_at
    ) values (
      matched_invitation.gym_id, current_user_id, assigned_role,
      assigned_staff_role_id, 'active', now()
    )
    returning id into accepted_membership_id;
  end if;

  update public.invitations
  set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
  where id = matched_invitation.id;
  return accepted_membership_id;
end;
$$;

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
  selected_staff_role_id uuid;
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

  if target_role_key = 'member' then
    if not private.can_manage_staff(target_gym_id, null) then
      raise exception 'Invitation role assignment is not permitted' using errcode = '42501';
    end if;
    membership_role := 'member';
    selected_staff_role_id := null;
  else
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
    selected_staff_role_id := selected_role.id;
  end if;

  insert into public.invitations (
    gym_id, email, token_hash, role, staff_role_id, invited_by, expires_at
  ) values (
    target_gym_id, lower(trim(invite_email)), invitation_token_hash,
    membership_role, selected_staff_role_id, actor_id, invitation_expires_at
  ) returning id into invitation_id;

  insert into public.audit_logs (
    gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata
  ) values (
    target_gym_id, actor_id, 'user', 'staff.invitation.created', 'invitation', invitation_id,
    jsonb_build_object('role', target_role_key, 'expires_at', invitation_expires_at)
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
  authorised boolean;
begin
  if actor_id is null or not private.is_current_email_verified() then
    raise exception 'A verified account is required' using errcode = '28000';
  end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '30 days' then
    raise exception 'Invitation token or expiry is invalid' using errcode = '22023';
  end if;
  select item.* into invitation from public.invitations item
  where item.id = target_invitation_id for update;
  if not found or invitation.status <> 'pending' then
    raise exception 'Invitation cannot be resent' using errcode = '42501';
  end if;
  if invitation.role = 'member' then
    role_key := 'member';
    authorised := private.can_manage_staff(invitation.gym_id, null);
  else
    select role.key into role_key from public.staff_roles role
    where role.id = invitation.staff_role_id and role.gym_id = invitation.gym_id;
    authorised := found and private.can_manage_staff(invitation.gym_id, role_key);
  end if;
  if not authorised then raise exception 'Invitation cannot be resent' using errcode = '42501'; end if;

  update public.invitations
  set token_hash = invitation_token_hash, expires_at = invitation_expires_at
  where id = invitation.id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(invitation.gym_id,actor_id,'user','staff.invitation.resent','invitation',invitation.id,
    jsonb_build_object('role',role_key,'expires_at',invitation_expires_at));
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
  authorised boolean;
begin
  select item.* into invitation from public.invitations item
  where item.id = target_invitation_id for update;
  if actor_id is null or not found or invitation.status <> 'pending' then
    raise exception 'Invitation cannot be revoked' using errcode = '42501';
  end if;
  if invitation.role = 'member' then
    role_key := 'member';
    authorised := private.can_manage_staff(invitation.gym_id, null);
  else
    select role.key into role_key from public.staff_roles role
    where role.id = invitation.staff_role_id and role.gym_id = invitation.gym_id;
    authorised := found and private.can_manage_staff(invitation.gym_id, role_key);
  end if;
  if not authorised then raise exception 'Invitation cannot be revoked' using errcode = '42501'; end if;

  update public.invitations set status='revoked',revoked_at=now() where id=invitation.id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(invitation.gym_id,actor_id,'user','staff.invitation.revoked','invitation',invitation.id,
    jsonb_build_object('role',role_key));
  return invitation.id;
end;
$$;

revoke all on function public.get_gym_invitation_status(text) from public,anon;
revoke all on function public.accept_gym_invitation(text) from public,anon;
revoke all on function public.create_staff_invitation(uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.get_gym_invitation_status(text) to authenticated,service_role;
grant execute on function public.accept_gym_invitation(text) to authenticated,service_role;
grant execute on function public.create_staff_invitation(uuid,text,text,text,timestamptz) to authenticated,service_role;

comment on function public.get_gym_invitation_status(text) is
  'Returns a non-secret lifecycle state for an authenticated bearer of an invitation token.';
comment on function public.accept_gym_invitation(text) is
  'Atomically consumes one email-bound invitation and creates or updates exactly one caller membership.';
