-- Prompt 14: structured private feedback, triage, popularity metrics, and rate limits.

alter table public.route_feedback add column feedback_kind text not null default 'other_issue'
  check (feedback_kind in ('loved_it','grade_soft','grade_right','grade_hard','spinning_hold','dirty_hold','other_issue'));
alter table public.route_feedback add column issue_status text not null default 'open'
  check (issue_status in ('open','reviewing','resolved','dismissed'));
alter table public.route_feedback drop constraint route_feedback_route_profile_key;
alter table public.route_feedback drop constraint route_feedback_content_check;
alter table public.route_feedback add constraint route_feedback_content_check check (
  feedback_kind <> 'other_issue' or (comment is not null and char_length(trim(comment)) between 1 and 1000)
);
create unique index route_feedback_once_per_kind_idx
on public.route_feedback(route_id, profile_id, feedback_kind) where archived_at is null;
create index route_feedback_triage_idx on public.route_feedback(gym_id, issue_status, created_at desc)
where feedback_kind in ('spinning_hold','dirty_hold','other_issue') and archived_at is null;

create table private.action_rate_limits (
  actor_id uuid not null,
  gym_id uuid not null,
  action text not null,
  window_started_at timestamptz not null,
  action_count integer not null check (action_count > 0),
  primary key(actor_id, gym_id, action, window_started_at)
);

create or replace function private.consume_action_limit(target_gym_id uuid, action_name text, maximum integer, window_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
declare window_start timestamptz; new_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  window_start := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into private.action_rate_limits(actor_id,gym_id,action,window_started_at,action_count)
  values(auth.uid(),target_gym_id,action_name,window_start,1)
  on conflict(actor_id,gym_id,action,window_started_at) do update
    set action_count=private.action_rate_limits.action_count+1
  returning action_count into new_count;
  if new_count > maximum then raise exception 'Too many requests. Please try again later.' using errcode='P0001'; end if;
end; $$;
revoke all on function private.consume_action_limit(uuid,text,integer,integer) from public,anon,authenticated;

create or replace function public.submit_route_feedback(target_gym_id uuid,target_route_id uuid,target_kind text,feedback_comment text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare feedback_id uuid; normalized_comment text;
begin
  if target_kind not in ('loved_it','grade_soft','grade_right','grade_hard','spinning_hold','dirty_hold','other_issue') then raise exception 'Feedback type is invalid' using errcode='22023'; end if;
  if private.current_membership_id(target_gym_id) is null or not private.can_read_route(target_route_id,target_gym_id) then raise exception 'Published route access is required' using errcode='42501'; end if;
  normalized_comment := nullif(trim(feedback_comment),'');
  if target_kind='other_issue' and (normalized_comment is null or char_length(normalized_comment)>1000) then raise exception 'Describe the issue in 1 to 1000 characters' using errcode='22023'; end if;
  perform private.consume_action_limit(target_gym_id,'route_feedback',20,3600);
  insert into public.route_feedback(gym_id,route_id,profile_id,feedback_kind,grade_vote,quality_rating,comment,visibility,moderation_status,issue_status)
  values(target_gym_id,target_route_id,auth.uid(),target_kind,
    case target_kind when 'grade_soft' then 'soft' when 'grade_right' then 'right' when 'grade_hard' then 'hard' else null end,
    case when target_kind='loved_it' then 5 else null end,normalized_comment,'staff','visible','open')
  returning id into feedback_id;
  return feedback_id;
exception when unique_violation then
  raise exception 'You have already sent this feedback for the route' using errcode='23505';
end; $$;

create or replace function public.toggle_route_favourite(target_gym_id uuid,target_route_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if private.current_membership_id(target_gym_id) is null or not private.can_read_route(target_route_id,target_gym_id) then raise exception 'Published route access is required' using errcode='42501'; end if;
  perform private.consume_action_limit(target_gym_id,'route_favourite',60,3600);
  if exists(select 1 from public.favourites where gym_id=target_gym_id and route_id=target_route_id and profile_id=auth.uid()) then
    delete from public.favourites where gym_id=target_gym_id and route_id=target_route_id and profile_id=auth.uid(); return false;
  end if;
  insert into public.favourites(gym_id,route_id,profile_id) values(target_gym_id,target_route_id,auth.uid()); return true;
end; $$;

create or replace function public.get_route_public_metrics(target_gym_id uuid,target_route_id uuid)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
begin
  if private.current_membership_id(target_gym_id) is null or not private.can_read_route(target_route_id,target_gym_id) then raise exception 'Published route access is required' using errcode='42501'; end if;
  return jsonb_build_object(
    'favourites',(select count(*) from public.favourites where gym_id=target_gym_id and route_id=target_route_id),
    'ascents',(select count(*) from public.ascent_logs where gym_id=target_gym_id and route_id=target_route_id and deleted_at is null and ascent_type<>'attempt'),
    'loved',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='loved_it' and archived_at is null),
    'grade_soft',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_soft' and archived_at is null),
    'grade_right',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_right' and archived_at is null),
    'grade_hard',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_hard' and archived_at is null)
  );
end; $$;

create or replace function public.triage_route_feedback(target_feedback_id uuid,target_status text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare feedback public.route_feedback;
begin
  if target_status not in ('open','reviewing','resolved','dismissed') then raise exception 'Triage status is invalid' using errcode='22023'; end if;
  select * into feedback from public.route_feedback where id=target_feedback_id;
  if feedback.id is null then raise exception 'Feedback was not found' using errcode='22023'; end if;
  if not (private.has_gym_capability(feedback.gym_id,'route_feedback.read') or private.has_gym_capability(feedback.gym_id,'routes.manage')) then raise exception 'Feedback triage access is required' using errcode='42501'; end if;
  update public.route_feedback set issue_status=target_status where id=feedback.id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(feedback.gym_id,auth.uid(),'user','route_feedback.triaged','route_feedback',feedback.id,jsonb_build_object('status',target_status));
  return feedback.id;
end; $$;

drop trigger protect_route_feedback_moderation on public.route_feedback;
create trigger protect_route_feedback_moderation before update on public.route_feedback
for each row execute function private.require_capability_for_column_changes('route_feedback.read','moderation_status','issue_status');

drop policy route_feedback_select_allowed on public.route_feedback;
create policy route_feedback_select_private on public.route_feedback for select to authenticated
using(profile_id=auth.uid() or private.has_gym_capability(gym_id,'route_feedback.read') or private.has_gym_capability(gym_id,'routes.manage'));
drop policy route_feedback_insert_self on public.route_feedback;
drop policy route_feedback_update_self_or_staff on public.route_feedback;
drop policy route_feedback_delete_self on public.route_feedback;

drop policy wall_images_select_member on public.wall_images;
create policy wall_images_select_member on public.wall_images for select to authenticated using (
  private.has_gym_capability(gym_id,'routes.manage')
  or (private.current_membership_id(gym_id) is not null and (
    (is_current and archived_at is null)
    or exists(select 1 from public.routes route where route.wall_image_id=wall_images.id and route.gym_id=wall_images.gym_id and private.can_read_route(route.id,route.gym_id))
  ))
);

revoke insert,update,delete on public.route_feedback from authenticated;
revoke insert,delete on public.favourites from authenticated;
revoke all on function public.submit_route_feedback(uuid,uuid,text,text) from public,anon;
revoke all on function public.toggle_route_favourite(uuid,uuid) from public,anon;
revoke all on function public.get_route_public_metrics(uuid,uuid) from public,anon;
revoke all on function public.triage_route_feedback(uuid,text) from public,anon;
grant execute on function public.submit_route_feedback(uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.toggle_route_favourite(uuid,uuid) to authenticated,service_role;
grant execute on function public.get_route_public_metrics(uuid,uuid) to authenticated,service_role;
grant execute on function public.triage_route_feedback(uuid,text) to authenticated,service_role;
