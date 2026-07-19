-- QR-first, authenticated member access. Existing email invitation records and RPCs
-- remain for backward compatibility but are removed from the application workflow.

drop policy if exists gym_memberships_insert_public_request on public.gym_memberships;
drop policy if exists gyms_select_public_join on public.gyms;

create table public.gym_join_credentials (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  join_identifier uuid not null default gen_random_uuid(),
  join_code text not null,
  enabled boolean not null default true,
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_join_credentials_identifier_key unique (join_identifier),
  constraint gym_join_credentials_code_key unique (join_code),
  constraint gym_join_credentials_code_check check (
    join_code = upper(join_code)
    and join_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
  )
);

create table private.gym_join_credential_history (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  join_identifier uuid not null,
  join_code text not null,
  rotated_at timestamptz not null default now(),
  primary key (gym_id, rotated_at),
  constraint gym_join_credential_history_identifier_key unique (join_identifier),
  constraint gym_join_credential_history_code_key unique (join_code)
);

create table private.gym_join_code_attempts (
  actor_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index gym_join_code_attempts_actor_time_idx
on private.gym_join_code_attempts (actor_id, attempted_at desc);

create trigger gym_join_credentials_set_updated_at
before update on public.gym_join_credentials
for each row execute function public.set_updated_at();

alter table public.gym_join_credentials enable row level security;
create policy gym_join_credentials_select_manager on public.gym_join_credentials
for select to authenticated
using (private.can_manage_staff(gym_id, null));
revoke insert, update, delete on public.gym_join_credentials from authenticated;

create or replace function private.generate_gym_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  candidate text;
  position integer;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    candidate := '';
    for position in 0..7 loop
      candidate := candidate || substr(alphabet, (get_byte(bytes, position) % 32) + 1, 1);
    end loop;
    if not exists (select 1 from public.gym_join_credentials where join_code = candidate)
      and not exists (select 1 from private.gym_join_credential_history where join_code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;
revoke all on function private.generate_gym_join_code() from public, anon, authenticated;

create or replace function private.provision_gym_join_credentials()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.gym_join_credentials (gym_id, join_identifier, join_code)
  values (new.id, extensions.gen_random_uuid(), private.generate_gym_join_code());
  return new;
end;
$$;
revoke all on function private.provision_gym_join_credentials() from public, anon, authenticated;

create trigger provision_gym_join_credentials
after insert on public.gyms
for each row execute function private.provision_gym_join_credentials();

do $$
declare gym record;
begin
  for gym in select id from public.gyms loop
    insert into public.gym_join_credentials (gym_id, join_identifier, join_code)
    values (gym.id, extensions.gen_random_uuid(), private.generate_gym_join_code())
    on conflict (gym_id) do nothing;
  end loop;
end;
$$;

create or replace function private.enforce_gym_join_code_rate_limit()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := auth.uid();
  recent_attempts bigint;
begin
  if current_actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_actor_id::text, 1));
  delete from private.gym_join_code_attempts
  where attempted_at < now() - interval '1 day';
  select count(*) into recent_attempts
  from private.gym_join_code_attempts
  where gym_join_code_attempts.actor_id = current_actor_id
    and attempted_at >= now() - interval '15 minutes';
  if recent_attempts >= 20 then
    raise exception 'Too many gym code attempts. Try again later.' using errcode = 'P0001';
  end if;
  insert into private.gym_join_code_attempts (actor_id) values (current_actor_id);
end;
$$;
revoke all on function private.enforce_gym_join_code_rate_limit() from public, anon, authenticated;

create or replace function public.get_gym_join_status(join_reference text, reference_kind text)
returns table(state text, gym_id uuid, gym_slug text, gym_name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reference text;
  credential public.gym_join_credentials%rowtype;
  selected_gym public.gyms%rowtype;
  membership public.gym_memberships%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if reference_kind = 'code' then
    perform private.enforce_gym_join_code_rate_limit();
    normalized_reference := upper(regexp_replace(coalesce(join_reference, ''), '[^A-Za-z0-9]', '', 'g'));
    if normalized_reference !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
      return query select 'invalid'::text, null::uuid, null::text, null::text;
      return;
    end if;
    select item.* into credential from public.gym_join_credentials item
    where item.join_code = normalized_reference;
    if credential.gym_id is null and exists (
      select 1 from private.gym_join_credential_history history
      where history.join_code = normalized_reference
    ) then
      return query select 'rotated'::text, null::uuid, null::text, null::text;
      return;
    end if;
  elsif reference_kind = 'qr' and coalesce(join_reference, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select item.* into credential from public.gym_join_credentials item
    where item.join_identifier = join_reference::uuid;
    if credential.gym_id is null and exists (
      select 1 from private.gym_join_credential_history history
      where history.join_identifier = join_reference::uuid
    ) then
      return query select 'rotated'::text, null::uuid, null::text, null::text;
      return;
    end if;
  else
    return query select 'invalid'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if credential.gym_id is null then
    return query select 'invalid'::text, null::uuid, null::text, null::text;
    return;
  end if;
  select item.* into selected_gym from public.gyms item where item.id = credential.gym_id;
  if not credential.enabled then
    return query select 'disabled'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
    return;
  end if;
  if selected_gym.archived_at is not null or selected_gym.status not in ('trial', 'active') then
    return query select 'unavailable'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
    return;
  end if;
  select item.* into membership from public.gym_memberships item
  where item.gym_id = selected_gym.id and item.profile_id = actor_id;
  if found and membership.status = 'active' then
    return query select 'already_member'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
  elsif found and membership.status in ('suspended', 'left') then
    return query select 'blocked'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
  elsif found and (membership.role <> 'member' or membership.staff_role_id is not null) then
    return query select 'blocked'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
  end if;
  return query select 'valid'::text, selected_gym.id, selected_gym.slug, selected_gym.name;
end;
$$;

create or replace function public.join_gym_as_member(join_reference text, reference_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reference text;
  credential public.gym_join_credentials%rowtype;
  selected_gym public.gyms%rowtype;
  membership public.gym_memberships%rowtype;
  membership_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if reference_kind = 'code' then
    perform private.enforce_gym_join_code_rate_limit();
    normalized_reference := upper(regexp_replace(coalesce(join_reference, ''), '[^A-Za-z0-9]', '', 'g'));
    select item.* into credential from public.gym_join_credentials item
    where normalized_reference ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
      and item.join_code = normalized_reference
    for update;
  elsif reference_kind = 'qr' and coalesce(join_reference, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select item.* into credential from public.gym_join_credentials item
    where item.join_identifier = join_reference::uuid
    for update;
  else
    raise exception 'Gym access code is invalid' using errcode = '22023';
  end if;
  if not found then
    if exists (
      select 1 from private.gym_join_credential_history history
      where (reference_kind = 'code' and history.join_code = normalized_reference)
        or (reference_kind = 'qr' and history.join_identifier::text = join_reference)
    ) then
      raise exception 'Gym access code has been rotated' using errcode = 'P0001';
    end if;
    raise exception 'Gym access code is invalid' using errcode = '22023';
  end if;
  select item.* into selected_gym from public.gyms item
  where item.id = credential.gym_id for update;
  if not credential.enabled then
    raise exception 'Gym member access is disabled' using errcode = '42501';
  end if;
  if selected_gym.archived_at is not null or selected_gym.status not in ('trial', 'active') then
    raise exception 'Gym is unavailable' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id
      and profile.suspended_at is null
      and profile.deleted_at is null
      and profile.deactivated_at is null
  ) then
    raise exception 'An active profile is required' using errcode = '42501';
  end if;

  select item.* into membership from public.gym_memberships item
  where item.gym_id = selected_gym.id and item.profile_id = actor_id
  for update;
  if found and membership.status = 'active' then
    return membership.id;
  elsif found and (
    membership.status in ('suspended', 'left')
    or membership.role <> 'member'
    or membership.staff_role_id is not null
  ) then
    raise exception 'Existing membership cannot use public member access' using errcode = '42501';
  elsif found then
    update public.gym_memberships
    set role = 'member', staff_role_id = null, status = 'active', joined_at = now(),
        suspended_at = null, left_at = null
    where id = membership.id returning id into membership_id;
  else
    insert into public.gym_memberships (gym_id, profile_id, role, staff_role_id, status, joined_at)
    values (selected_gym.id, actor_id, 'member', null, 'active', now())
    returning id into membership_id;
  end if;

  insert into public.audit_logs (gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values (
    selected_gym.id, actor_id, 'user', 'membership.join_code.joined',
    'membership', membership_id, jsonb_build_object('method', reference_kind)
  );
  return membership_id;
end;
$$;

create or replace function public.get_gym_join_credentials(target_gym_id uuid)
returns table(join_identifier uuid, join_code text, enabled boolean, rotated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_staff(target_gym_id, null) then
    raise exception 'Member access management is not permitted' using errcode = '42501';
  end if;
  return query select item.join_identifier, item.join_code, item.enabled, item.rotated_at
  from public.gym_join_credentials item where item.gym_id = target_gym_id;
end;
$$;

create or replace function public.rotate_gym_join_credentials(target_gym_id uuid)
returns table(join_identifier uuid, join_code text, enabled boolean, rotated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare credential public.gym_join_credentials%rowtype;
begin
  if not private.can_manage_staff(target_gym_id, null) then
    raise exception 'Member access management is not permitted' using errcode = '42501';
  end if;
  select item.* into credential from public.gym_join_credentials item
  where item.gym_id = target_gym_id for update;
  if not found then raise exception 'Gym access configuration was not found' using errcode = '22023'; end if;
  insert into private.gym_join_credential_history (gym_id, join_identifier, join_code, rotated_at)
  values (credential.gym_id, credential.join_identifier, credential.join_code, now());
  update public.gym_join_credentials item
  set join_identifier = extensions.gen_random_uuid(),
      join_code = private.generate_gym_join_code(),
      rotated_at = now()
  where item.gym_id = target_gym_id
  returning item.* into credential;
  insert into public.audit_logs (gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values (target_gym_id, auth.uid(), 'user', 'gym.member_access.rotated', 'gym', target_gym_id, '{}');
  return query select credential.join_identifier, credential.join_code, credential.enabled, credential.rotated_at;
end;
$$;

create or replace function public.set_gym_join_enabled(target_gym_id uuid, access_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed boolean;
begin
  if not private.can_manage_staff(target_gym_id, null) then
    raise exception 'Member access management is not permitted' using errcode = '42501';
  end if;
  update public.gym_join_credentials
  set enabled = access_enabled
  where gym_id = target_gym_id and enabled <> access_enabled;
  changed := found;
  if changed then
    insert into public.audit_logs (gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
    values (
      target_gym_id, auth.uid(), 'user', 'gym.member_access.' || case when access_enabled then 'enabled' else 'disabled' end,
      'gym', target_gym_id, jsonb_build_object('enabled', access_enabled)
    );
  end if;
  return access_enabled;
end;
$$;

-- Staff access is assigned only after a person has joined as a member. This replaces
-- member/staff invitation UX while retaining the existing delegation boundaries.
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
  select item.* into membership from public.gym_memberships item
  where item.id = target_membership_id for update;
  if not found then raise exception 'Membership was not found' using errcode = '22023'; end if;
  select role.key into old_role_key from public.staff_roles role
  where role.id = membership.staff_role_id and role.gym_id = membership.gym_id;
  select role.* into selected_role from public.staff_roles role
  where role.gym_id = membership.gym_id
    and role.key = target_role_key
    and role.is_system
    and role.archived_at is null;
  if actor_id is null or not found
    or membership.profile_id = actor_id
    or membership.role not in ('member', 'staff', 'route_setter')
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
  insert into public.audit_logs (gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values (
    membership.gym_id, actor_id, 'user', 'staff.access.updated', 'gym_membership', membership.id,
    jsonb_build_object(
      'old_role', coalesce(old_role_key, membership.role), 'new_role', selected_role.key,
      'old_status', membership.status, 'new_status', target_status
    )
  );
  return membership.id;
end;
$$;

revoke all on function public.get_gym_join_status(text, text) from public, anon;
revoke all on function public.join_gym_as_member(text, text) from public, anon;
revoke all on function public.get_gym_join_credentials(uuid) from public, anon;
revoke all on function public.rotate_gym_join_credentials(uuid) from public, anon;
revoke all on function public.set_gym_join_enabled(uuid, boolean) from public, anon;
grant execute on function public.get_gym_join_status(text, text) to authenticated, service_role;
grant execute on function public.join_gym_as_member(text, text) to authenticated, service_role;
grant execute on function public.get_gym_join_credentials(uuid) to authenticated, service_role;
grant execute on function public.rotate_gym_join_credentials(uuid) to authenticated, service_role;
grant execute on function public.set_gym_join_enabled(uuid, boolean) to authenticated, service_role;

comment on table public.gym_join_credentials is
  'Current non-privileged gym member access identifiers. Visible only to authorised gym managers.';
comment on function public.join_gym_as_member(text, text) is
  'Creates at most one active caller-bound member membership from the current QR identifier or manual code.';
