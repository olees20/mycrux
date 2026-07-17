-- Prompt 22: explicit opt-in community leaderboards with capped scoring.
create table public.leaderboard_preferences(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,profile_id uuid not null references public.profiles(id) on delete cascade,
  opted_in boolean not null default false,display_name_mode text not null default 'anonymous' check(display_name_mode in ('name','anonymous')),updated_at timestamptz not null default now(),created_at timestamptz not null default now(),
  constraint leaderboard_preferences_gym_profile_key unique(gym_id,profile_id),constraint leaderboard_preferences_id_gym_key unique(id,gym_id)
);
create index leaderboard_preferences_gym_opted_idx on public.leaderboard_preferences(gym_id,profile_id) where opted_in;
create trigger leaderboard_preferences_set_updated_at before update on public.leaderboard_preferences for each row execute function public.set_updated_at();
alter table public.leaderboard_preferences enable row level security;alter table public.leaderboard_preferences force row level security;
grant select on public.leaderboard_preferences to authenticated;grant all on public.leaderboard_preferences to service_role;
create policy leaderboard_preferences_select_self on public.leaderboard_preferences for select to authenticated using(profile_id=auth.uid());
create index ascent_logs_community_rank_idx on public.ascent_logs(gym_id,session_date,profile_id,route_id,created_at) where deleted_at is null and ascent_type in ('flash','onsight','redpoint','repeat');
create index climbing_sessions_community_rank_idx on public.climbing_sessions(gym_id,session_date,profile_id);

create or replace function public.set_leaderboard_preference(target_gym_id uuid,participate boolean,name_mode text)
returns uuid language plpgsql security definer set search_path='' as $$declare preference_id uuid;begin if private.current_membership_id(target_gym_id) is null or name_mode not in ('name','anonymous') then raise exception 'Leaderboard preference is invalid' using errcode='22023';end if;insert into public.leaderboard_preferences(gym_id,profile_id,opted_in,display_name_mode)values(target_gym_id,auth.uid(),participate,name_mode)on conflict(gym_id,profile_id)do update set opted_in=excluded.opted_in,display_name_mode=excluded.display_name_mode returning id into preference_id;return preference_id;end;$$;

create or replace function public.get_community_leaderboard(target_gym_id uuid,category text,window_month date)
returns table(rank bigint,profile_id uuid,display_name text,score numeric,window_start date,window_end date,tie_achieved_at date)
language plpgsql security definer stable set search_path='' as $$
#variable_conflict use_column
begin
  if private.current_membership_id(target_gym_id) is null or category not in ('monthly_sends','challenge_points','streaks') or window_month<>date_trunc('month',window_month)::date then raise exception 'Leaderboard request is invalid' using errcode='22023';end if;
  return query with opted as(
    select preference.profile_id,preference.display_name_mode,profile.display_name from public.leaderboard_preferences preference join public.profiles profile on profile.id=preference.profile_id join public.gym_memberships membership on membership.gym_id=preference.gym_id and membership.profile_id=preference.profile_id and membership.status='active' where preference.gym_id=target_gym_id and preference.opted_in
  ),unique_sends as(
    select ascent.profile_id,ascent.route_id,ascent.session_date,ascent.ascent_type,row_number()over(partition by ascent.profile_id order by ascent.session_date,ascent.created_at,ascent.id) scoring_order from(select distinct on(profile_id,route_id,session_date) * from public.ascent_logs where gym_id=target_gym_id and deleted_at is null and ascent_type in('flash','onsight','redpoint','repeat') and session_date>=window_month and session_date<(window_month+interval '1 month')::date order by profile_id,route_id,session_date,created_at,id)ascent
  ),send_scores as(
    select profile_id,count(*)filter(where scoring_order<=20)::numeric monthly_sends,sum(case when scoring_order<=20 then 10+case when ascent_type='flash' then 2 else 0 end else 0 end)::numeric challenge_points,min(session_date)tie_date from unique_sends group by profile_id
  ),weeks as(
    select distinct session.profile_id,date_trunc('week',session.session_date::timestamp)::date week from public.climbing_sessions session where session.gym_id=target_gym_id and session.session_date>=(window_month+interval '1 month'-interval '12 weeks')::date and session.session_date<(window_month+interval '1 month')::date
  ),week_groups as(select profile_id,week,week-(row_number()over(partition by profile_id order by week)::integer*7)grp from weeks),streak_scores as(select profile_id,max(run)::numeric streaks,min(first_week)tie_date from(select profile_id,grp,count(*)run,min(week)first_week from week_groups group by profile_id,grp)runs group by profile_id),scores as(
    select opted.profile_id,case category when 'monthly_sends' then coalesce(send_scores.monthly_sends,0) when 'challenge_points' then coalesce(send_scores.challenge_points,0) else coalesce(streak_scores.streaks,0) end score,case when category='streaks' then streak_scores.tie_date else send_scores.tie_date end tie_date,opted.display_name_mode,opted.display_name from opted left join send_scores using(profile_id)left join streak_scores using(profile_id)
  )select row_number()over(order by scores.score desc,scores.tie_date asc nulls last,scores.profile_id),scores.profile_id,case when scores.display_name_mode='name' then scores.display_name else 'Climber '||substr(md5(target_gym_id::text||scores.profile_id::text),1,6)end,scores.score,window_month,(window_month+interval '1 month')::date,scores.tie_date from scores order by scores.score desc,scores.tie_date asc nulls last,scores.profile_id limit 100;
end;$$;
revoke all on function public.set_leaderboard_preference(uuid,boolean,text) from public,anon;revoke all on function public.get_community_leaderboard(uuid,text,date) from public,anon;grant execute on function public.set_leaderboard_preference(uuid,boolean,text) to authenticated,service_role;grant execute on function public.get_community_leaderboard(uuid,text,date) to authenticated,service_role;
