-- Prompt 35: append-only audit enforcement and privacy-scoped portability.
create or replace function private.prevent_audit_mutation()returns trigger language plpgsql set search_path=''as $$begin raise exception'Audit records are append-only'using errcode='42501';end$$;
create trigger prevent_audit_mutation before update or delete on public.audit_logs for each row execute function private.prevent_audit_mutation();
revoke insert,update,delete on public.audit_logs from anon,authenticated;

create or replace function public.export_my_gym_data(target_gym_id uuid)returns jsonb language plpgsql security definer set search_path=''
as $$declare result jsonb;begin
  if private.current_membership_id(target_gym_id)is null then raise insufficient_privilege;end if;
  select jsonb_build_object(
    'exported_at',now(),'gym_id',target_gym_id,
    'profile',(select jsonb_build_object('id',id,'display_name',display_name,'pronouns',pronouns,'bio',bio,'locale',locale,'created_at',created_at)from public.profiles where id=auth.uid()),
    'membership',(select jsonb_build_object('role',role,'status',status,'joined_at',joined_at,'last_active_at',last_active_at)from public.gym_memberships where gym_id=target_gym_id and profile_id=auth.uid()),
    'ascents',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'session_date',session_date,'outcome',ascent_type,'attempts',attempts,'notes',notes,'visibility',visibility,'route_name',route_name_snapshot,'route_grade',route_grade_snapshot,'route_grade_system',route_grade_system_snapshot,'created_at',created_at)order by session_date desc),'[]'::jsonb)from public.ascent_logs where gym_id=target_gym_id and profile_id=auth.uid()),
    'accepted_waivers',(select coalesce(jsonb_agg(jsonb_build_object('acceptance_id',acceptance.id,'accepted_at',acceptance.accepted_at,'retention_until',acceptance.retention_until,'waiver_title',version.title,'version',version.version,'content_hash',version.content_hash)order by acceptance.accepted_at desc),'[]'::jsonb)from public.waiver_acceptances acceptance join public.waiver_versions version on version.id=acceptance.waiver_version_id where acceptance.gym_id=target_gym_id and acceptance.profile_id=auth.uid())
  )into result;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(target_gym_id,auth.uid(),'user','privacy.member_export.created','profile',auth.uid(),'{}');return result;
end$$;

create or replace function public.export_gym_operational_data(target_gym_id uuid)returns jsonb language plpgsql security definer set search_path=''
as $$declare result jsonb;begin
  if not private.has_gym_role(target_gym_id,array['owner'])then raise insufficient_privilege;end if;
  select jsonb_build_object(
    'exported_at',now(),'gym',(select jsonb_build_object('id',id,'slug',slug,'name',name,'legal_name',legal_name,'timezone',timezone,'country_code',country_code,'status',status,'created_at',created_at)from public.gyms where id=target_gym_id),
    'membership_counts',(select coalesce(jsonb_object_agg(role,total),'{}'::jsonb)from(select role,count(*)total from public.gym_memberships where gym_id=target_gym_id and status='active'group by role)counts),
    'routes',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'wall_id',wall_id,'name',name,'colour',colour,'grade_system',grade_system,'grade',grade,'route_type',route_type,'status',status,'set_on',set_on,'retire_on',retire_on)order by created_at),'[]'::jsonb)from public.routes where gym_id=target_gym_id),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'starts_at',starts_at,'ends_at',ends_at,'capacity',capacity,'status',status,'visibility',visibility)order by starts_at),'[]'::jsonb)from public.events where gym_id=target_gym_id),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'status',status,'audience',audience,'published_at',published_at)order by created_at),'[]'::jsonb)from public.announcements where gym_id=target_gym_id),
    'check_in_totals',(select coalesce(jsonb_agg(jsonb_build_object('day',check_in_day,'source',source,'total',total)order by check_in_day desc),'[]'::jsonb)from(select checked_in_at::date check_in_day,source,count(*)total from public.check_ins where gym_id=target_gym_id group by checked_in_at::date,source)counts),
    'audit_events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'actor_type',actor_type,'action',action,'target_type',target_type,'target_id',target_id,'outcome',outcome,'created_at',created_at)order by created_at desc),'[]'::jsonb)from(select*from public.audit_logs where gym_id=target_gym_id order by created_at desc limit 5000)events)
  )into result;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(target_gym_id,auth.uid(),'user','privacy.gym_export.created','gym',target_gym_id,'{}');return result;
end$$;
revoke all on function public.export_my_gym_data(uuid),public.export_gym_operational_data(uuid)from public,anon;grant execute on function public.export_my_gym_data(uuid),public.export_gym_operational_data(uuid)to authenticated;
