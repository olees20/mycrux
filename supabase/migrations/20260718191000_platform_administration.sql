-- Prompt 32: audited, privacy-minimising platform tenant operations.
alter table public.gyms
  add column suspended_at timestamptz,
  add column suspension_reason text check (suspension_reason is null or char_length(suspension_reason) between 3 and 500),
  add column status_before_suspension text check (status_before_suspension is null or status_before_suspension in ('trial','active','past_due','closed'));

create table public.platform_support_notes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  note text not null check (char_length(btrim(note)) between 3 and 2000),
  created_at timestamptz not null default now()
);
create index platform_support_notes_gym_time_idx on public.platform_support_notes(gym_id,created_at desc);
alter table public.platform_support_notes enable row level security;
alter table public.platform_support_notes force row level security;
create policy platform_support_notes_deny_users on public.platform_support_notes for all to anon,authenticated using(false)with check(false);
revoke all on public.platform_support_notes from public,anon,authenticated;
grant all on public.platform_support_notes to service_role;

create or replace function private.assert_platform_admin(actor_profile_id uuid)
returns void language plpgsql stable security definer set search_path=''
as $$begin
  if actor_profile_id is null or not exists(select 1 from public.profiles where id=actor_profile_id and is_platform_admin and suspended_at is null and deleted_at is null) then
    raise insufficient_privilege using message='Platform administrator access is required';
  end if;
end$$;
revoke all on function private.assert_platform_admin(uuid) from public,anon,authenticated;
grant execute on function private.assert_platform_admin(uuid) to service_role;

create or replace function public.platform_list_gyms(actor_profile_id uuid,search_term text default '',result_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path=''
as $$declare result jsonb;begin
  perform private.assert_platform_admin(actor_profile_id);
  if char_length(search_term)>120 or result_limit not between 1 and 100 then raise exception'Invalid platform gym search' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(summary)order by summary.created_at desc),'[]'::jsonb) into result from(
    select gym.id,gym.slug,gym.name,gym.status,gym.created_at,gym.suspended_at,
      case when gym.status='suspended'then'suspended' when not exists(select 1 from public.gym_memberships membership where membership.gym_id=gym.id and membership.role='owner'and membership.status='active')then'owner_required' else'ready'end onboarding_state,
      (select count(*)::integer from public.gym_memberships membership where membership.gym_id=gym.id and membership.status='active')member_count,
      subscription.status subscription_status,subscription.plan_key
    from public.gyms gym
    left join lateral(select candidate.status,candidate.plan_key from public.subscriptions candidate where candidate.gym_id=gym.id order by(candidate.status in('trialing','active','past_due','paused','unpaid','incomplete'))desc,candidate.created_at desc limit 1)subscription on true
    where search_term=''or gym.name ilike'%'||search_term||'%'or gym.slug ilike'%'||search_term||'%'
    order by gym.created_at desc limit result_limit
  )summary;
  return result;
end$$;

create or replace function public.platform_gym_support_view(actor_profile_id uuid,target_gym_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$declare result jsonb;begin
  perform private.assert_platform_admin(actor_profile_id);
  select jsonb_build_object(
    'gym',jsonb_build_object('id',gym.id,'slug',gym.slug,'name',gym.name,'status',gym.status,'created_at',gym.created_at,'suspended_at',gym.suspended_at,'suspension_reason',gym.suspension_reason),
    'membership_counts',(select coalesce(jsonb_object_agg(grouped.role,grouped.total),'{}'::jsonb)from(select role,count(*)total from public.gym_memberships where gym_id=gym.id and status='active'group by role)grouped),
    'subscription',(select to_jsonb(subscription)-array['stripe_subscription_id','stripe_price_id']from public.subscriptions subscription where subscription.gym_id=gym.id order by(subscription.status in('trialing','active','past_due','paused','unpaid','incomplete'))desc,subscription.created_at desc limit 1),
    'entitlements',(select coalesce(jsonb_agg(jsonb_build_object('feature_key',feature_key,'enabled',enabled,'limit_value',limit_value,'source',source,'ends_at',ends_at)order by feature_key),'[]'::jsonb)from public.feature_entitlements where gym_id=gym.id),
    'support_notes',(select coalesce(jsonb_agg(jsonb_build_object('id',note.id,'note',note.note,'created_at',note.created_at,'author',profile.display_name)order by note.created_at desc),'[]'::jsonb)from(select*from public.platform_support_notes where gym_id=gym.id order by created_at desc limit 50)note join public.profiles profile on profile.id=note.author_profile_id),
    'audit_events',(select coalesce(jsonb_agg(jsonb_build_object('id',event.id,'action',event.action,'target_type',event.target_type,'target_id',event.target_id,'outcome',event.outcome,'created_at',event.created_at)order by event.created_at desc),'[]'::jsonb)from(select*from public.audit_logs where gym_id=gym.id order by created_at desc limit 100)event)
  )into result from public.gyms gym where gym.id=target_gym_id;
  if result is null then raise exception'Gym not found'using errcode='P0002';end if;
  return result;
end$$;

create or replace function public.add_platform_support_note(actor_profile_id uuid,target_gym_id uuid,note_body text)
returns uuid language plpgsql security definer set search_path=''
as $$declare note_id uuid;begin
  perform private.assert_platform_admin(actor_profile_id);
  if char_length(btrim(note_body))not between 3 and 2000 then raise exception'Invalid support note'using errcode='22023';end if;
  insert into public.platform_support_notes(gym_id,author_profile_id,note)values(target_gym_id,actor_profile_id,btrim(note_body))returning id into note_id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(target_gym_id,actor_profile_id,'platform_admin','platform.support_note.created','support_note',note_id,'{}');
  return note_id;
end$$;

create or replace function public.suspend_platform_gym(actor_profile_id uuid,target_gym_id uuid,reason text)
returns void language plpgsql security definer set search_path=''
as $$declare selected public.gyms;begin
  perform private.assert_platform_admin(actor_profile_id);
  if char_length(btrim(reason))not between 3 and 500 then raise exception'A suspension reason is required'using errcode='22023';end if;
  select*into selected from public.gyms where id=target_gym_id for update;
  if selected.id is null then raise exception'Gym not found'using errcode='P0002';end if;
  if selected.status<>'suspended'then update public.gyms set status_before_suspension=selected.status,status='suspended',suspended_at=now(),suspension_reason=btrim(reason)where id=selected.id;end if;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(selected.id,actor_profile_id,'platform_admin','gym.suspended','gym',selected.id,jsonb_build_object('reason',btrim(reason),'previous_status',selected.status));
end$$;

create or replace function public.restore_platform_gym(actor_profile_id uuid,target_gym_id uuid,reason text)
returns void language plpgsql security definer set search_path=''
as $$declare selected public.gyms;restored_status text;begin
  perform private.assert_platform_admin(actor_profile_id);
  if char_length(btrim(reason))not between 3 and 500 then raise exception'A restoration reason is required'using errcode='22023';end if;
  select*into selected from public.gyms where id=target_gym_id for update;
  if selected.id is null or selected.status<>'suspended'then raise exception'Gym is not suspended'using errcode='22023';end if;
  restored_status:=coalesce(selected.status_before_suspension,'active');
  update public.gyms set status=restored_status,suspended_at=null,suspension_reason=null,status_before_suspension=null where id=selected.id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(selected.id,actor_profile_id,'platform_admin','gym.restored','gym',selected.id,jsonb_build_object('reason',btrim(reason),'restored_status',restored_status));
end$$;

revoke all on function public.platform_list_gyms(uuid,text,integer),public.platform_gym_support_view(uuid,uuid),public.add_platform_support_note(uuid,uuid,text),public.suspend_platform_gym(uuid,uuid,text),public.restore_platform_gym(uuid,uuid,text)from public,anon,authenticated;
grant execute on function public.platform_list_gyms(uuid,text,integer),public.platform_gym_support_view(uuid,uuid),public.add_platform_support_note(uuid,uuid,text),public.suspend_platform_gym(uuid,uuid,text),public.restore_platform_gym(uuid,uuid,text)to service_role;
