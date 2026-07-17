-- Prompt 14 structured feedback, privacy, triage, metrics, and rate limits.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);

select public.submit_route_feedback('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','loved_it',null);
select public.submit_route_feedback('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','grade_right',null);
select public.submit_route_feedback('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','spinning_hold',null);

do $$ begin
  begin
    perform public.submit_route_feedback('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','loved_it',null);
    raise exception 'Duplicate feedback kind was accepted';
  exception when unique_violation then null; end;
  begin
    perform public.submit_route_feedback('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','other_issue','');
    raise exception 'Empty other issue was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    insert into public.route_feedback(gym_id,route_id,profile_id,feedback_kind) values('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',auth.uid(),'dirty_hold');
    raise exception 'Member bypassed the rate-limited feedback RPC';
  exception when insufficient_privilege then null; end;
end; $$;

do $$
declare metric jsonb; state boolean; counter integer;
begin
  metric := public.get_route_public_metrics('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001');
  if (metric->>'loved')::integer <> 1 or (metric->>'grade_right')::integer <> 1 then raise exception 'Public metrics are incorrect'; end if;
  state := public.toggle_route_favourite('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001');
  if not state then raise exception 'Favourite was not created'; end if;
  for counter in 2..60 loop perform public.toggle_route_favourite('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001'); end loop;
  begin
    perform public.toggle_route_favourite('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001');
    raise exception 'Favourite rate limit was not enforced';
  exception when raise_exception then null; end;
  begin
    perform public.triage_route_feedback((select id from public.route_feedback where feedback_kind='spinning_hold' limit 1),'resolved');
    raise exception 'Member triaged private feedback';
  exception when insufficient_privilege then null; end;
end; $$;

set local role service_role;
insert into public.route_feedback(gym_id,route_id,profile_id,feedback_kind,comment,visibility)
values('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','other_issue','Private setter report','public');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  if exists(select 1 from public.route_feedback where profile_id='10000000-0000-4000-8000-000000000003') then raise exception 'Another reporter identity leaked to a member'; end if;
end; $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ declare target_id uuid; begin
  select id into target_id from public.route_feedback where feedback_kind='spinning_hold';
  perform public.triage_route_feedback(target_id,'resolved');
  if not exists(select 1 from public.route_feedback where id=target_id and issue_status='resolved') then raise exception 'Staff triage failed'; end if;
end; $$;

set local role service_role;
do $$ begin
  if not exists(select 1 from public.audit_logs where action='route_feedback.triaged') then raise exception 'Triage was not audited'; end if;
end; $$;

rollback;
