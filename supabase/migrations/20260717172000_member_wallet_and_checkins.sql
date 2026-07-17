-- Prompt 17: short-lived member QR tokens and durable, gym-scoped check-ins.

alter table public.gyms add column membership_source text not null default 'platform' check(membership_source in ('platform','external','hybrid'));
alter table public.gym_memberships add column external_reference text check(external_reference is null or char_length(external_reference)<=240);
alter table public.gym_memberships add column external_synced_at timestamptz;

create table public.check_in_tokens(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),expires_at timestamptz not null,consumed_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now(),
  constraint check_in_tokens_id_gym_key unique(id,gym_id),constraint check_in_tokens_expiry_check check(expires_at>created_at)
);
create index check_in_tokens_lookup_idx on public.check_in_tokens(gym_id,token_hash) where consumed_at is null and revoked_at is null;
create index check_in_tokens_profile_idx on public.check_in_tokens(gym_id,profile_id,created_at desc);

create table public.check_ins(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,profile_id uuid references public.profiles(id) on delete restrict,guest_invite_id uuid,pass_id uuid,
  verified_by uuid references public.profiles(id) on delete set null,source text not null check(source in ('member_qr','manual','guest_pass','integration')),checked_in_at timestamptz not null default now(),metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  constraint check_ins_guest_fkey foreign key(guest_invite_id,gym_id) references public.guest_invites(id,gym_id) on delete restrict,
  constraint check_ins_pass_fkey foreign key(pass_id,gym_id) references public.passes(id,gym_id) on delete restrict,
  constraint check_ins_subject_check check(num_nonnulls(profile_id,guest_invite_id)=1),constraint check_ins_id_gym_key unique(id,gym_id)
);
create unique index check_ins_pass_once_idx on public.check_ins(pass_id) where pass_id is not null;
create index check_ins_gym_time_idx on public.check_ins(gym_id,checked_in_at desc);
create index check_ins_profile_time_idx on public.check_ins(profile_id,checked_in_at desc) where profile_id is not null;

alter table public.check_in_tokens enable row level security;
alter table public.check_ins enable row level security;
alter table public.check_in_tokens force row level security;
alter table public.check_ins force row level security;
grant select on public.check_in_tokens,public.check_ins to authenticated;
grant all on public.check_in_tokens,public.check_ins to service_role;
create policy check_in_tokens_select_self on public.check_in_tokens for select to authenticated using(profile_id=auth.uid());
create policy check_ins_select_allowed on public.check_ins for select to authenticated using(profile_id=auth.uid() or private.has_gym_capability(gym_id,'guests.check_in') or private.has_gym_capability(gym_id,'passes.manage'));

create or replace function private.member_waivers_complete(target_profile_id uuid,target_gym_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select not exists(
    select 1 from public.waivers waiver join public.waiver_versions version on version.waiver_id=waiver.id and version.gym_id=waiver.gym_id and version.status='published' and version.effective_at<=now()
    where waiver.gym_id=target_gym_id and waiver.is_required and waiver.archived_at is null
      and not exists(select 1 from public.waiver_acceptances acceptance where acceptance.gym_id=target_gym_id and acceptance.profile_id=target_profile_id and acceptance.waiver_version_id=version.id and acceptance.revoked_at is null)
  )
$$;

create or replace function public.issue_member_check_in_token(target_gym_id uuid,new_token_hash text,token_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$ declare token_id uuid; begin
  if private.current_membership_id(target_gym_id) is null then raise exception 'Active gym membership is required' using errcode='42501'; end if;
  if not private.valid_reference_hash(new_token_hash) or token_expires_at<=now() or token_expires_at>now()+interval '5 minutes' then raise exception 'Check-in token expiry is invalid' using errcode='22023'; end if;
  perform private.consume_action_limit(target_gym_id,'member_check_in_token',30,3600);
  update public.check_in_tokens set revoked_at=now() where gym_id=target_gym_id and profile_id=auth.uid() and consumed_at is null and revoked_at is null;
  insert into public.check_in_tokens(gym_id,profile_id,token_hash,expires_at) values(target_gym_id,auth.uid(),new_token_hash,token_expires_at) returning id into token_id;return token_id;
end; $$;

create or replace function public.verify_member_check_in_token(target_gym_id uuid,member_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$ declare token public.check_in_tokens; membership public.gym_memberships; member_name text; source_name text; begin
  if not (private.has_gym_capability(target_gym_id,'guests.check_in') or private.has_gym_capability(target_gym_id,'passes.manage')) then raise exception 'Front desk access is required' using errcode='42501'; end if;
  select * into token from public.check_in_tokens where gym_id=target_gym_id and token_hash=member_token_hash;
  if token.id is null then return jsonb_build_object('found',false); end if;
  select * into membership from public.gym_memberships where gym_id=target_gym_id and profile_id=token.profile_id;
  select display_name into member_name from public.profiles where id=token.profile_id;select membership_source into source_name from public.gyms where id=target_gym_id;
  return jsonb_build_object('found',true,'member_name',member_name,'membership_status',membership.status,'membership_source',source_name,'waivers_complete',private.member_waivers_complete(token.profile_id,target_gym_id),'token_status',case when token.consumed_at is not null then 'used' when token.revoked_at is not null then 'revoked' when token.expires_at<=now() then 'expired' else 'valid' end,'expires_at',token.expires_at);
end; $$;

create or replace function private.record_member_check_in(target_gym_id uuid,target_profile_id uuid,check_in_source text,details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$ declare check_in_id uuid; begin
  if exists(select 1 from public.check_ins where gym_id=target_gym_id and profile_id=target_profile_id and checked_in_at>now()-interval '30 seconds') then raise exception 'Member was already checked in moments ago' using errcode='P0001'; end if;
  insert into public.check_ins(gym_id,profile_id,verified_by,source,metadata) values(target_gym_id,target_profile_id,auth.uid(),check_in_source,details) returning id into check_in_id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata) values(target_gym_id,auth.uid(),'user','member.checked_in','check_in',check_in_id,jsonb_build_object('source',check_in_source));return check_in_id;
end; $$;

create or replace function public.check_in_member_token(target_gym_id uuid,member_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$ declare token public.check_in_tokens; membership public.gym_memberships; check_in_id uuid; begin
  if not (private.has_gym_capability(target_gym_id,'guests.check_in') or private.has_gym_capability(target_gym_id,'passes.manage')) then raise exception 'Front desk access is required' using errcode='42501'; end if;
  select * into token from public.check_in_tokens where gym_id=target_gym_id and token_hash=member_token_hash for update;
  if token.id is null then raise exception 'Check-in token was not found' using errcode='22023'; end if;
  if token.consumed_at is not null then raise exception 'Check-in token has already been used' using errcode='P0001'; end if;
  if token.revoked_at is not null then raise exception 'Check-in token was replaced' using errcode='P0001'; end if;
  if token.expires_at<=now() then raise exception 'Check-in token has expired' using errcode='P0001'; end if;
  select * into membership from public.gym_memberships where gym_id=target_gym_id and profile_id=token.profile_id and status='active';
  if membership.id is null then raise exception 'Membership is not active' using errcode='P0001'; end if;
  if not private.member_waivers_complete(token.profile_id,target_gym_id) then raise exception 'Required waivers are incomplete' using errcode='P0001'; end if;
  update public.check_in_tokens set consumed_at=now() where id=token.id;
  check_in_id:=private.record_member_check_in(target_gym_id,token.profile_id,'member_qr',jsonb_build_object('token_id',token.id));return check_in_id;
end; $$;

create or replace function public.manual_member_check_in(target_gym_id uuid,target_membership_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$ declare membership public.gym_memberships; begin
  if not (private.has_gym_capability(target_gym_id,'guests.check_in') or private.has_gym_capability(target_gym_id,'passes.manage')) then raise exception 'Front desk access is required' using errcode='42501'; end if;
  select * into membership from public.gym_memberships where id=target_membership_id and gym_id=target_gym_id and status='active';if membership.id is null then raise exception 'Active membership was not found' using errcode='22023';end if;
  if not private.member_waivers_complete(membership.profile_id,target_gym_id) then raise exception 'Required waivers are incomplete' using errcode='P0001';end if;
  return private.record_member_check_in(target_gym_id,membership.profile_id,'manual',jsonb_build_object('membership_id',membership.id));
end; $$;

create or replace function private.record_guest_pass_check_in()
returns trigger language plpgsql security definer set search_path='' as $$ begin
  if old.status is distinct from 'used' and new.status='used' then insert into public.check_ins(gym_id,guest_invite_id,pass_id,verified_by,source,metadata) values(new.gym_id,new.guest_invite_id,new.id,auth.uid(),'guest_pass',jsonb_build_object('payment_state',new.payment_state)) on conflict(pass_id) where pass_id is not null do nothing;end if;return new;
end; $$;
create trigger record_guest_pass_check_in after update on public.passes for each row execute function private.record_guest_pass_check_in();

revoke all on function public.issue_member_check_in_token(uuid,text,timestamptz) from public,anon;
revoke all on function public.verify_member_check_in_token(uuid,text) from public,anon;
revoke all on function public.check_in_member_token(uuid,text) from public,anon;
revoke all on function public.manual_member_check_in(uuid,uuid) from public,anon;
grant execute on function public.issue_member_check_in_token(uuid,text,timestamptz) to authenticated,service_role;
grant execute on function public.verify_member_check_in_token(uuid,text) to authenticated,service_role;
grant execute on function public.check_in_member_token(uuid,text) to authenticated,service_role;
grant execute on function public.manual_member_check_in(uuid,uuid) to authenticated,service_role;
