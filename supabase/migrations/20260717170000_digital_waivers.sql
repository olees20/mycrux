-- Prompt 15: configurable, immutable waiver versions and narrow acceptance flows.

alter table public.waiver_versions add column requirements jsonb not null default '{"collect_date_of_birth":false,"require_age_confirmation":true,"minimum_age":18,"collect_emergency_contact":false,"consent_items":["I have read and agree to this waiver"]}'::jsonb
  check (jsonb_typeof(requirements)='object' and jsonb_typeof(requirements->'consent_items')='array');
alter table public.waiver_acceptances add column date_of_birth date;
alter table public.waiver_acceptances add column age_confirmed boolean;
alter table public.waiver_acceptances add column emergency_contact_name text check(emergency_contact_name is null or char_length(emergency_contact_name) between 1 and 160);
alter table public.waiver_acceptances add column emergency_contact_phone text check(emergency_contact_phone is null or char_length(emergency_contact_phone) between 1 and 40);
alter table public.waiver_acceptances add column signature_text text not null default '' check(char_length(signature_text) between 1 and 160);
alter table public.waiver_acceptances add column evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object');
alter table public.waiver_acceptances add column retention_until timestamptz not null default (now()+interval '6 years');

create or replace function private.protect_waiver_version()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.status in ('published','superseded') then raise exception 'Published waiver versions are immutable' using errcode='42501'; end if;
    return old;
  end if;
  if old.status='superseded' then raise exception 'Superseded waiver versions are immutable' using errcode='42501'; end if;
  if old.status='published' and not (
    new.status='superseded' and new.title=old.title and new.content=old.content and new.content_hash=old.content_hash
    and new.requirements=old.requirements and new.effective_at is not distinct from old.effective_at
    and new.published_at is not distinct from old.published_at and new.waiver_id=old.waiver_id and new.gym_id=old.gym_id
  ) then raise exception 'Published waiver versions are immutable' using errcode='42501'; end if;
  return new;
end; $$;
revoke all on function private.protect_waiver_version() from public,anon,authenticated;
create trigger protect_waiver_version before update or delete on public.waiver_versions
for each row execute function private.protect_waiver_version();

create or replace function private.validate_waiver_requirements(value jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(value)<>'object' or jsonb_typeof(value->'consent_items')<>'array'
    or jsonb_array_length(value->'consent_items') not between 1 and 20 then return false; end if;
  if coalesce((value->>'minimum_age')::integer,18) not between 1 and 120 then return false; end if;
  for item in select * from jsonb_array_elements(value->'consent_items') loop
    if jsonb_typeof(item)<>'string' or char_length(item#>>'{}') not between 1 and 500 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

alter table public.waiver_versions add constraint waiver_versions_requirements_valid_check
check(private.validate_waiver_requirements(requirements));

create or replace function public.save_waiver_draft(target_gym_id uuid,target_waiver_id uuid,template_name text,template_description text,required_for_entry boolean,version_title text,version_content text,version_requirements jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected_waiver_id uuid; version_id uuid; next_version integer; actor uuid:=auth.uid();
begin
  if not private.has_gym_capability(target_gym_id,'waivers.manage') then raise exception 'Waiver management access is required' using errcode='42501'; end if;
  if char_length(trim(template_name)) not between 1 and 160 or char_length(trim(version_title)) not between 1 and 200 or char_length(trim(version_content)) not between 1 and 100000 or not private.validate_waiver_requirements(version_requirements) then raise exception 'Waiver details are invalid' using errcode='22023'; end if;
  if target_waiver_id is null then
    insert into public.waivers(gym_id,name,description,is_required) values(target_gym_id,trim(template_name),nullif(trim(template_description),''),required_for_entry) returning id into selected_waiver_id;
  else
    update public.waivers set name=trim(template_name),description=nullif(trim(template_description),''),is_required=required_for_entry where id=target_waiver_id and gym_id=target_gym_id and archived_at is null returning id into selected_waiver_id;
    if selected_waiver_id is null then raise exception 'Waiver template was not found' using errcode='22023'; end if;
  end if;
  select existing.id into version_id from public.waiver_versions existing where existing.waiver_id=selected_waiver_id and existing.status='draft' order by existing.version desc limit 1 for update;
  if version_id is null then
    select coalesce(max(existing.version),0)+1 into next_version from public.waiver_versions existing where existing.waiver_id=selected_waiver_id;
    insert into public.waiver_versions(gym_id,waiver_id,version,title,content,content_hash,status,created_by,requirements)
    values(target_gym_id,selected_waiver_id,next_version,trim(version_title),trim(version_content),encode(extensions.digest(trim(version_content),'sha256'),'hex'),'draft',actor,version_requirements) returning id into version_id;
  else
    update public.waiver_versions set title=trim(version_title),content=trim(version_content),content_hash=encode(extensions.digest(trim(version_content),'sha256'),'hex'),requirements=version_requirements where id=version_id;
  end if;
  return version_id;
end; $$;

create or replace function public.publish_waiver_version(target_gym_id uuid,target_version_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected public.waiver_versions;
begin
  if not private.has_gym_capability(target_gym_id,'waivers.manage') then raise exception 'Waiver management access is required' using errcode='42501'; end if;
  select * into selected from public.waiver_versions where id=target_version_id and gym_id=target_gym_id and status='draft' for update;
  if selected.id is null then raise exception 'Draft waiver version was not found' using errcode='22023'; end if;
  update public.waiver_versions set status='superseded' where waiver_id=selected.waiver_id and status='published';
  update public.waiver_versions set status='published',published_at=now(),effective_at=now() where id=selected.id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','waiver.published','waiver_version',selected.id,jsonb_build_object('version',selected.version));
  return selected.id;
end; $$;

create or replace function private.validate_waiver_acceptance(requirements jsonb,acceptance jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(acceptance)<>'object' or char_length(trim(acceptance->>'accepted_name')) not between 1 and 160
    or char_length(trim(acceptance->>'signature_text')) not between 1 and 160
    or jsonb_typeof(acceptance->'consents')<>'array'
    or not ((requirements->'consent_items') <@ (acceptance->'consents')) then return false; end if;
  if coalesce((requirements->>'collect_date_of_birth')::boolean,false) and nullif(acceptance->>'date_of_birth','') is null then return false; end if;
  if coalesce((requirements->>'require_age_confirmation')::boolean,false) and coalesce((acceptance->>'age_confirmed')::boolean,false) is not true then return false; end if;
  if coalesce((requirements->>'collect_emergency_contact')::boolean,false) and (char_length(trim(acceptance->>'emergency_contact_name'))<1 or char_length(trim(acceptance->>'emergency_contact_phone'))<1) then return false; end if;
  return true;
exception when others then return false;
end; $$;

create or replace function public.accept_member_waiver(target_gym_id uuid,target_version_id uuid,acceptance jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected public.waiver_versions; acceptance_id uuid;
begin
  if private.current_membership_id(target_gym_id) is null then raise exception 'Active gym membership is required' using errcode='42501'; end if;
  select * into selected from public.waiver_versions where id=target_version_id and gym_id=target_gym_id and status='published' and effective_at<=now();
  if selected.id is null or not private.validate_waiver_acceptance(selected.requirements,acceptance) then raise exception 'Waiver acceptance is invalid' using errcode='22023'; end if;
  insert into public.waiver_acceptances(gym_id,waiver_version_id,profile_id,accepted_name,date_of_birth,age_confirmed,emergency_contact_name,emergency_contact_phone,signature_text,consent_snapshot,user_agent,evidence)
  values(target_gym_id,selected.id,auth.uid(),trim(acceptance->>'accepted_name'),nullif(acceptance->>'date_of_birth','')::date,coalesce((acceptance->>'age_confirmed')::boolean,false),nullif(trim(acceptance->>'emergency_contact_name'),''),nullif(trim(acceptance->>'emergency_contact_phone'),''),trim(acceptance->>'signature_text'),jsonb_build_object('consents',acceptance->'consents','requirements',selected.requirements),left(acceptance->>'user_agent',1000),jsonb_build_object('content_hash',selected.content_hash,'flow','member')) returning id into acceptance_id;
  return acceptance_id;
end; $$;

create or replace function public.accept_guest_waiver(invitation_token_hash text,target_version_id uuid,acceptance jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare invite public.guest_invites; selected public.waiver_versions; acceptance_id uuid;
begin
  if current_user not in ('service_role','postgres') then raise exception 'Service access is required' using errcode='42501'; end if;
  if invitation_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invitation token is invalid' using errcode='22023'; end if;
  select * into invite from public.guest_invites where token_hash=invitation_token_hash and status in ('pending','registered') and expires_at>now() and archived_at is null;
  select * into selected from public.waiver_versions where id=target_version_id and gym_id=invite.gym_id and status='published' and effective_at<=now();
  if invite.id is null or selected.id is null or not private.validate_waiver_acceptance(selected.requirements,acceptance) then raise exception 'Guest waiver acceptance is invalid' using errcode='22023'; end if;
  insert into public.waiver_acceptances(gym_id,waiver_version_id,guest_invite_id,accepted_name,date_of_birth,age_confirmed,emergency_contact_name,emergency_contact_phone,signature_text,consent_snapshot,user_agent,evidence)
  values(invite.gym_id,selected.id,invite.id,trim(acceptance->>'accepted_name'),nullif(acceptance->>'date_of_birth','')::date,coalesce((acceptance->>'age_confirmed')::boolean,false),nullif(trim(acceptance->>'emergency_contact_name'),''),nullif(trim(acceptance->>'emergency_contact_phone'),''),trim(acceptance->>'signature_text'),jsonb_build_object('consents',acceptance->'consents','requirements',selected.requirements),left(acceptance->>'user_agent',1000),jsonb_build_object('content_hash',selected.content_hash,'flow','guest')) returning id into acceptance_id;
  return acceptance_id;
end; $$;

drop policy waiver_versions_update_staff on public.waiver_versions;
drop policy waiver_versions_insert_staff on public.waiver_versions;
drop policy waiver_acceptances_insert_self on public.waiver_acceptances;
drop policy waiver_acceptances_update_staff on public.waiver_acceptances;
revoke insert,update,delete on public.waiver_acceptances from authenticated;
revoke insert,update,delete on public.waiver_versions from authenticated;
revoke delete on public.waivers from authenticated;
revoke all on function public.save_waiver_draft(uuid,uuid,text,text,boolean,text,text,jsonb) from public,anon;
revoke all on function public.publish_waiver_version(uuid,uuid) from public,anon;
revoke all on function public.accept_member_waiver(uuid,uuid,jsonb) from public,anon;
revoke all on function public.accept_guest_waiver(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_waiver_draft(uuid,uuid,text,text,boolean,text,text,jsonb) to authenticated,service_role;
grant execute on function public.publish_waiver_version(uuid,uuid) to authenticated,service_role;
grant execute on function public.accept_member_waiver(uuid,uuid,jsonb) to authenticated,service_role;
grant execute on function public.accept_guest_waiver(text,uuid,jsonb) to service_role;
