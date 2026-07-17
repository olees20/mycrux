-- Prompt 20 ownership, cross-gym protection, snapshots, sessions and privacy.
begin;
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$declare ascent_id uuid;session_id uuid;begin
  ascent_id:=public.save_ascent('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',null,null,current_date,'project',4,'Working the finish','private');
  select a.session_id into session_id from public.ascent_logs a where a.id=ascent_id;
  if session_id is null or not exists(select 1 from public.climbing_sessions where id=session_id and profile_id=auth.uid()) then raise exception 'Session was not created for the owner';end if;
  if not exists(select 1 from public.ascent_logs where id=ascent_id and route_grade_snapshot='6A' and wall_name_snapshot='Demo Slab') then raise exception 'Route snapshot was not captured';end if;
  perform public.save_ascent('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',ascent_id,session_id,current_date,'redpoint',5,'Sent it','gym');
  begin insert into public.ascent_logs(gym_id,route_id,profile_id,ascent_type)values('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',auth.uid(),'flash');raise exception 'Direct insert bypassed snapshot RPC';exception when insufficient_privilege then null;end;
  begin perform public.save_ascent('30000000-0000-4000-8000-000000000001','ffffffff-ffff-4fff-8fff-ffffffffffff',null,null,current_date,'flash',1,'','private');raise exception 'Cross-gym or absent route was accepted';exception when invalid_parameter_value then null;end;
end$$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare ascent_id uuid;begin
  select id into ascent_id from public.ascent_logs where profile_id='10000000-0000-4000-8000-000000000004';
  if ascent_id is null then raise exception 'Gym-visible ascent was hidden from another member';end if;
  begin perform public.save_ascent('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',ascent_id,null,current_date,'flash',1,'Hijack','public');raise exception 'Another user edited the ascent';exception when invalid_parameter_value then null;end;
end$$;

set local role service_role;update public.routes set status='archived',archived_at=now() where id='70000000-0000-4000-8000-000000000001';
set local role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin if not exists(select 1 from public.ascent_logs where route_name_snapshot='Lime and Punishment' and route_grade_snapshot='6A') then raise exception 'Archived-route snapshot disappeared from owner logbook';end if;end$$;
rollback;
