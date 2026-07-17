-- Prompt 16: pre-arrival guest/day-pass registration without platform payment processing.

alter table public.gyms add column day_pass_registration_enabled boolean not null default false;
alter table public.gyms add column day_pass_valid_hours integer not null default 16 check(day_pass_valid_hours between 1 and 168);
alter table public.gyms add column day_pass_information text check(day_pass_information is null or char_length(day_pass_information)<=2000);
alter table public.passes add column payment_state text not null default 'unpaid' check(payment_state in ('unpaid','reserved','confirmed','not_required'));
alter table public.passes add column registration_source text not null default 'staff' check(registration_source in ('visitor','member','staff','integration'));

create or replace function private.valid_reference_hash(value text)
returns boolean language sql immutable set search_path='' as $$ select value ~ '^[a-f0-9]{64}$' $$;

create or replace function private.insert_guest_pass(target_gym_id uuid,guest_full_name text,guest_email text,invitation_token_hash text,pass_reference_hash text,payment_choice text,source_name text,inviter uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare invite_id uuid; pass_id uuid; expiry timestamptz; hours integer;
begin
  if char_length(trim(guest_full_name)) not between 1 and 120 or (nullif(trim(guest_email),'') is not null and (lower(trim(guest_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(trim(guest_email))>320)) then raise exception 'Guest details are invalid' using errcode='22023'; end if;
  if not private.valid_reference_hash(invitation_token_hash) or not private.valid_reference_hash(pass_reference_hash) or payment_choice not in ('pay_at_reception','integration_placeholder') or source_name not in ('visitor','member','staff') then raise exception 'Registration details are invalid' using errcode='22023'; end if;
  select day_pass_valid_hours into hours from public.gyms where id=target_gym_id and archived_at is null;
  if hours is null then raise exception 'Gym was not found' using errcode='22023'; end if;
  expiry:=date_trunc('day',now())+interval '1 day'+make_interval(hours=>greatest(hours-8,1));
  insert into public.guest_invites(gym_id,invited_by,email,guest_name,token_hash,status,expires_at,registered_at)
  values(target_gym_id,inviter,nullif(lower(trim(guest_email)),''),trim(guest_full_name),invitation_token_hash,'registered',expiry,now()) returning id into invite_id;
  insert into public.passes(gym_id,guest_invite_id,pass_type,reference_code_hash,status,valid_from,valid_until,issued_by,metadata,payment_state,registration_source)
  values(target_gym_id,invite_id,'day_pass',pass_reference_hash,'pending',now(),expiry,case when source_name='staff' then inviter else null end,jsonb_build_object('payment_choice',payment_choice),case when payment_choice='pay_at_reception' then 'unpaid' else 'reserved' end,source_name) returning id into pass_id;
  return jsonb_build_object('guest_invite_id',invite_id,'pass_id',pass_id,'valid_until',expiry);
end; $$;
revoke all on function private.insert_guest_pass(uuid,text,text,text,text,text,text,uuid) from public,anon,authenticated;

create or replace function public.register_public_day_pass(target_gym_slug text,guest_full_name text,guest_email text,invitation_token_hash text,pass_reference_hash text,payment_choice text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target_gym public.gyms;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Service access is required' using errcode='42501'; end if;
  select * into target_gym from public.gyms where slug=target_gym_slug and day_pass_registration_enabled and status in ('trial','active') and archived_at is null;
  if target_gym.id is null then raise exception 'Public day-pass registration is unavailable' using errcode='22023'; end if;
  return private.insert_guest_pass(target_gym.id,guest_full_name,guest_email,invitation_token_hash,pass_reference_hash,payment_choice,'visitor',null);
end; $$;

create or replace function public.create_guest_pass(target_gym_id uuid,guest_full_name text,guest_email text,invitation_token_hash text,pass_reference_hash text,payment_choice text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare source_name text;
begin
  if private.has_gym_capability(target_gym_id,'guests.manage') then source_name:='staff';
  elsif private.current_membership_id(target_gym_id) is not null then source_name:='member'; perform private.consume_action_limit(target_gym_id,'guest_registration',10,86400);
  else raise exception 'Active gym access is required' using errcode='42501'; end if;
  return private.insert_guest_pass(target_gym_id,guest_full_name,guest_email,invitation_token_hash,pass_reference_hash,payment_choice,source_name,auth.uid());
end; $$;

create or replace function public.configure_day_pass_registration(target_gym_id uuid,registration_enabled boolean,valid_hours integer,public_information text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not private.has_gym_role(target_gym_id,array['owner']) then raise exception 'Gym owner access is required' using errcode='42501'; end if;
  if valid_hours not between 1 and 168 or char_length(coalesce(public_information,''))>2000 then raise exception 'Day-pass configuration is invalid' using errcode='22023'; end if;
  update public.gyms set day_pass_registration_enabled=registration_enabled,day_pass_valid_hours=valid_hours,day_pass_information=nullif(trim(public_information),'') where id=target_gym_id;
  return target_gym_id;
end; $$;

create or replace function private.guest_waivers_complete(target_guest_id uuid,target_gym_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select not exists(
    select 1 from public.waivers waiver
    join public.waiver_versions version on version.waiver_id=waiver.id and version.gym_id=waiver.gym_id and version.status='published' and version.effective_at<=now()
    where waiver.gym_id=target_gym_id and waiver.is_required and waiver.archived_at is null
      and not exists(select 1 from public.waiver_acceptances acceptance where acceptance.gym_id=target_gym_id and acceptance.guest_invite_id=target_guest_id and acceptance.waiver_version_id=version.id and acceptance.revoked_at is null)
  )
$$;

create or replace function public.verify_guest_pass(target_gym_id uuid,pass_reference_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare selected public.passes; guest public.guest_invites; waiver_complete boolean;
begin
  if not (private.has_gym_capability(target_gym_id,'guests.check_in') or private.has_gym_capability(target_gym_id,'passes.manage')) then raise exception 'Front desk access is required' using errcode='42501'; end if;
  if not private.valid_reference_hash(pass_reference_hash) then raise exception 'Pass reference is invalid' using errcode='22023'; end if;
  select * into selected from public.passes where gym_id=target_gym_id and reference_code_hash=pass_reference_hash and archived_at is null;
  if selected.id is null then return jsonb_build_object('found',false); end if;
  select * into guest from public.guest_invites where id=selected.guest_invite_id;
  waiver_complete:=private.guest_waivers_complete(guest.id,target_gym_id);
  return jsonb_build_object('found',true,'pass_id',selected.id,'guest_name',guest.guest_name,'status',case when selected.valid_until<=now() and selected.status not in ('used','revoked') then 'expired' when selected.status='used' then 'checked_in' else selected.status end,'payment_state',selected.payment_state,'waivers_complete',waiver_complete,'valid_until',selected.valid_until,'registration_source',selected.registration_source);
end; $$;

create or replace function public.check_in_guest_pass(target_gym_id uuid,pass_reference_hash text,confirm_reception_payment boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected public.passes;
begin
  if not (private.has_gym_capability(target_gym_id,'guests.check_in') or private.has_gym_capability(target_gym_id,'passes.manage')) then raise exception 'Front desk access is required' using errcode='42501'; end if;
  select * into selected from public.passes where gym_id=target_gym_id and reference_code_hash=pass_reference_hash and archived_at is null for update;
  if selected.id is null then raise exception 'Pass was not found' using errcode='22023'; end if;
  if selected.status='used' then raise exception 'Pass has already been checked in' using errcode='P0001'; end if;
  if selected.status='revoked' then raise exception 'Pass has been revoked' using errcode='P0001'; end if;
  if selected.valid_until<=now() then update public.passes set status='expired' where id=selected.id; raise exception 'Pass has expired' using errcode='P0001'; end if;
  if not private.guest_waivers_complete(selected.guest_invite_id,target_gym_id) then raise exception 'Required waivers are incomplete' using errcode='P0001'; end if;
  if selected.payment_state='unpaid' and not confirm_reception_payment then raise exception 'Payment at reception must be confirmed' using errcode='P0001'; end if;
  update public.passes set status='used',used_at=now(),payment_state=case when selected.payment_state='unpaid' then 'confirmed' else selected.payment_state end where id=selected.id;
  update public.guest_invites set status='checked_in',checked_in_at=now() where id=selected.guest_invite_id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','guest.checked_in','pass',selected.id,jsonb_build_object('payment_state',case when selected.payment_state='unpaid' then 'confirmed' else selected.payment_state end));
  return selected.id;
end; $$;

create or replace function public.revoke_guest_pass(target_gym_id uuid,target_pass_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not private.has_gym_capability(target_gym_id,'passes.manage') then raise exception 'Pass management access is required' using errcode='42501'; end if;
  update public.passes set status='revoked',revoked_at=now() where id=target_pass_id and gym_id=target_gym_id and status not in ('used','revoked') returning id into target_pass_id;
  if target_pass_id is null then raise exception 'Revocable pass was not found' using errcode='22023'; end if;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata) values(target_gym_id,auth.uid(),'user','guest.pass.revoked','pass',target_pass_id,'{}');
  return target_pass_id;
end; $$;

drop policy guest_invites_insert_staff on public.guest_invites;
drop policy guest_invites_update_staff on public.guest_invites;
drop policy guest_invites_delete_staff on public.guest_invites;
drop policy passes_manage_staff on public.passes;
create policy passes_select_staff on public.passes for select to authenticated using(private.has_gym_capability(gym_id,'passes.manage') or private.has_gym_capability(gym_id,'guests.check_in'));
revoke insert,update,delete on public.guest_invites from authenticated;
revoke insert,update,delete on public.passes from authenticated;
revoke all on function public.register_public_day_pass(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.create_guest_pass(uuid,text,text,text,text,text) from public,anon;
revoke all on function public.configure_day_pass_registration(uuid,boolean,integer,text) from public,anon;
revoke all on function public.verify_guest_pass(uuid,text) from public,anon;
revoke all on function public.check_in_guest_pass(uuid,text,boolean) from public,anon;
revoke all on function public.revoke_guest_pass(uuid,uuid) from public,anon;
grant execute on function public.register_public_day_pass(text,text,text,text,text,text) to service_role;
grant execute on function public.create_guest_pass(uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.configure_day_pass_registration(uuid,boolean,integer,text) to authenticated,service_role;
grant execute on function public.verify_guest_pass(uuid,text) to authenticated,service_role;
grant execute on function public.check_in_guest_pass(uuid,text,boolean) to authenticated,service_role;
grant execute on function public.revoke_guest_pass(uuid,uuid) to authenticated,service_role;
