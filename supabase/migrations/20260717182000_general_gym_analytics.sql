-- Prompt 28: reproducible owner/manager operational KPIs with equal-period comparison.
create or replace function public.get_gym_operational_analytics(target_gym_id uuid,date_from date,date_to date)
returns table(period text,metric_key text,metric_label text,metric_value bigint,definition text)
language plpgsql stable security definer set search_path=''as $$begin
if not(private.has_gym_role(target_gym_id,array['owner'])or private.has_gym_capability(target_gym_id,'analytics.read'))then raise insufficient_privilege;end if;
if date_from is null or date_to<date_from or date_to-date_from>366 then raise exception'Date range must be 1–367 days'using errcode='22023';end if;
return query with periods(period_name,starts_at,ends_at)as(values('current',date_from::timestamptz,(date_to+1)::timestamptz),('previous',(date_from-(date_to-date_from+1))::timestamptz,date_from::timestamptz))
select periods.period_name,metrics.key,metrics.label,metrics.value,metrics.description from periods cross join lateral(
select'active_users','Active users',(select count(distinct activity.profile_id)from(
select profile_id from public.check_ins where gym_id=target_gym_id and profile_id is not null and checked_in_at>=periods.starts_at and checked_in_at<periods.ends_at union
select profile_id from public.ascent_logs where gym_id=target_gym_id and deleted_at is null and climbed_at>=periods.starts_at and climbed_at<periods.ends_at union
select author_id from public.community_posts where gym_id=target_gym_id and deleted_at is null and created_at>=periods.starts_at and created_at<periods.ends_at union
select profile_id from public.event_registrations where gym_id=target_gym_id and profile_id is not null and registered_at>=periods.starts_at and registered_at<periods.ends_at)activity),'Distinct member profiles with a check-in, ascent, visible/non-deleted post, or event registration in the period.'
union all select'member_registrations','Member registrations',(select count(*)from public.gym_memberships where gym_id=target_gym_id and joined_at>=periods.starts_at and joined_at<periods.ends_at),'Gym memberships whose joined_at timestamp falls in the period.'
union all select'check_ins','Check-ins',(select count(*)from public.check_ins where gym_id=target_gym_id and checked_in_at>=periods.starts_at and checked_in_at<periods.ends_at),'Member and guest check-in records created in the period; not a live occupancy measure.'
union all select'waiver_completions','Waiver completions',(select count(*)from public.waiver_acceptances where gym_id=target_gym_id and revoked_at is null and accepted_at>=periods.starts_at and accepted_at<periods.ends_at),'Non-revoked member and guest waiver acceptances signed in the period.'
union all select'event_registrations','Event registrations',(select count(*)from public.event_registrations where gym_id=target_gym_id and registered_at>=periods.starts_at and registered_at<periods.ends_at),'Event registration records created in the period, including later cancellation state.'
union all select'community_engagement','Community engagement',(select(select count(*)from public.community_posts where gym_id=target_gym_id and deleted_at is null and created_at>=periods.starts_at and created_at<periods.ends_at)+(select count(*)from public.comments where gym_id=target_gym_id and deleted_at is null and created_at>=periods.starts_at and created_at<periods.ends_at)+(select count(*)from public.reactions where gym_id=target_gym_id and created_at>=periods.starts_at and created_at<periods.ends_at)),'Non-deleted posts and comments plus reactions created in the period; private chat is excluded.'
union all select'route_usage','Route usage',(select count(*)from public.ascent_logs where gym_id=target_gym_id and deleted_at is null and climbed_at>=periods.starts_at and climbed_at<periods.ends_at),'Non-deleted ascent log records in the period; notes and member identities are excluded.'
)metrics(key,label,value,description)order by metrics.key,periods.period_name;end$$;
revoke all on function public.get_gym_operational_analytics(uuid,date,date)from public,anon;
grant execute on function public.get_gym_operational_analytics(uuid,date,date)to authenticated;
