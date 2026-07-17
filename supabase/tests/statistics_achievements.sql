-- Prompt 21 date boundaries, idempotent awards and private ownership.
begin;
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.save_ascent('30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',null,null,current_date,'flash',1,'First flash','private');
set local role service_role;
insert into public.climbing_sessions(gym_id,profile_id,session_date)values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2025-12-29'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-01-05'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-01-12'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-01-19'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-02-01'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-03-01'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-04-01'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-05-01'),
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2026-06-01');
set local role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$declare first_run integer;second_run integer;begin first_run:=public.process_my_achievements('30000000-0000-4000-8000-000000000001');second_run:=public.process_my_achievements('30000000-0000-4000-8000-000000000001');if first_run<>4 or second_run<>0 then raise exception 'Achievement processing was not idempotent: %, %',first_run,second_run;end if;if (select count(*) from public.member_achievements where profile_id=auth.uid())<>4 then raise exception 'Expected achievement examples were not awarded once';end if;begin insert into public.member_achievements(gym_id,profile_id,achievement_key,title,description)values('30000000-0000-4000-8000-000000000001',auth.uid(),'fake','Fake','Fake');raise exception 'Direct achievement insert succeeded';exception when insufficient_privilege then null;end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin if exists(select 1 from public.member_achievements) then raise exception 'Another member saw private achievements';end if;end$$;
rollback;
