-- Prompt 22 opt-in, anonymous names, score caps and deterministic ranks.
begin;
set local role service_role;
insert into public.routes(id,gym_id,wall_id,name,colour,grade_system,grade,route_type,status,published_at)
select md5('leaderboard-route-'||series)::uuid,'30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Leaderboard route '||series,'blue','font','6A','boulder','published',now() from generate_series(1,25)series;
insert into public.ascent_logs(gym_id,route_id,profile_id,session_date,climbed_at,ascent_type,attempts,visibility,route_name_snapshot,route_colour_snapshot,route_grade_snapshot,route_grade_system_snapshot,wall_name_snapshot)
select '30000000-0000-4000-8000-000000000001',md5('leaderboard-route-'||series)::uuid,'10000000-0000-4000-8000-000000000004',date_trunc('month',current_date)::date,current_date::timestamptz+interval '12 hours','redpoint',1,'private','Leaderboard route '||series,'blue','6A','font','Demo Slab' from generate_series(1,25)series;
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.set_leaderboard_preference('30000000-0000-4000-8000-000000000001',true,'anonymous');
do $$declare row_count integer;member_name text;member_score numeric;begin select count(*),max(display_name),max(score)into row_count,member_name,member_score from public.get_community_leaderboard('30000000-0000-4000-8000-000000000001','monthly_sends',date_trunc('month',current_date)::date);if row_count<>1 or member_name not like 'Climber %' then raise exception 'Opt-in or anonymous display failed';end if;if member_score<>20 then raise exception 'Monthly score cap failed: %',member_score;end if;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin if exists(select 1 from public.get_community_leaderboard('30000000-0000-4000-8000-000000000001','monthly_sends',date_trunc('month',current_date)::date)where profile_id=auth.uid())then raise exception 'Non-opted member appeared';end if;end$$;
select public.set_leaderboard_preference('30000000-0000-4000-8000-000000000001',true,'name');
do $$begin if not exists(select 1 from public.get_community_leaderboard('30000000-0000-4000-8000-000000000001','monthly_sends',date_trunc('month',current_date)::date)where profile_id=auth.uid() and display_name='Demo Owner')then raise exception 'Display-name choice failed';end if;end$$;
rollback;
