-- Prompt 6: profile bootstrap, public membership requests, and invitation acceptance.

-- Trusted PostgREST service-role requests may perform protected administrative writes.
-- Ordinary authenticated JWTs cannot set this claim through the API.
create or replace function private.prevent_protected_column_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  protected_column text;
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  foreach protected_column in array tg_argv loop
    if to_jsonb(old) -> protected_column is distinct from to_jsonb(new) -> protected_column then
      raise exception 'Changing protected column % is not allowed', protected_column
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.require_capability_for_column_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  column_index integer;
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  for column_index in 1..(tg_nargs - 1) loop
    if to_jsonb(old) -> tg_argv[column_index] is distinct from to_jsonb(new) -> tg_argv[column_index]
      and not private.has_gym_capability(new.gym_id, tg_argv[0]) then
      raise exception 'Changing protected staff column % requires capability %',
        tg_argv[column_index], tg_argv[0]
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(requested_name, split_part(coalesce(new.email, 'climber'), '@', 1)), 80)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.is_current_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users auth_user
    where auth_user.id = auth.uid()
      and auth_user.email_confirmed_at is not null
  );
$$;

revoke all on function private.is_current_email_verified() from public, anon;
grant execute on function private.is_current_email_verified() to authenticated, service_role;

create policy gyms_select_public_join on public.gyms
for select to authenticated
using (
  public_join_requests_enabled
  and status in ('trial', 'active')
  and archived_at is null
);

create policy gym_memberships_insert_public_request on public.gym_memberships
for insert to authenticated
with check (
  profile_id = auth.uid()
  and private.is_current_email_verified()
  and role = 'member'
  and staff_role_id is null
  and status = 'invited'
  and joined_at is null
  and exists (
    select 1
    from public.gyms gym
    where gym.id = gym_memberships.gym_id
      and gym.public_join_requests_enabled
      and gym.status in ('trial', 'active')
      and gym.archived_at is null
  )
);

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
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invitation token is invalid' using errcode = '22023';
  end if;

  select lower(auth_user.email)
  into current_email
  from auth.users auth_user
  where auth_user.id = current_user_id
    and auth_user.email_confirmed_at is not null;

  if current_email is null then
    raise exception 'A verified email address is required' using errcode = '28000';
  end if;

  select invitation.*
  into matched_invitation
  from public.invitations invitation
  where invitation.token_hash = invitation_token_hash
  for update;

  if not found
    or matched_invitation.status <> 'pending'
    or matched_invitation.expires_at <= now()
    or lower(matched_invitation.email) <> current_email then
    raise exception 'Invitation is invalid, expired, or belongs to another account'
      using errcode = '42501';
  end if;

  select membership.*
  into existing_membership
  from public.gym_memberships membership
  where membership.gym_id = matched_invitation.gym_id
    and membership.profile_id = current_user_id
  for update;

  if found and existing_membership.status = 'active' then
    accepted_membership_id := existing_membership.id;
  elsif found and existing_membership.status <> 'invited' then
    raise exception 'Existing membership state cannot accept this invitation'
      using errcode = '42501';
  elsif found then
    update public.gym_memberships
    set role = matched_invitation.role,
        staff_role_id = matched_invitation.staff_role_id,
        status = 'active',
        joined_at = now(),
        suspended_at = null,
        left_at = null
    where id = existing_membership.id
    returning id into accepted_membership_id;
  else
    insert into public.gym_memberships (
      gym_id, profile_id, role, staff_role_id, status, joined_at
    )
    values (
      matched_invitation.gym_id,
      current_user_id,
      matched_invitation.role,
      matched_invitation.staff_role_id,
      'active',
      now()
    )
    returning id into accepted_membership_id;
  end if;

  update public.invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = matched_invitation.id;

  return accepted_membership_id;
end;
$$;

revoke all on function public.accept_gym_invitation(text) from public, anon;
grant execute on function public.accept_gym_invitation(text) to authenticated, service_role;

comment on function public.accept_gym_invitation(text) is
  'Atomically accepts one pending invitation for the verified current user email.';
