-- Prompt 43: deterministic demo completeness and normal-role tenant isolation.
do $$ begin
  if (select count(*) from public.gyms where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'))<>2 then raise exception 'Two demo gyms are required'; end if;
  if not exists(select 1 from public.events where id='81000000-0000-4000-8000-000000000001') or not exists(select 1 from public.ascent_logs where id='82000000-0000-4000-8000-000000000001') or not exists(select 1 from public.community_posts where id='83000000-0000-4000-8000-000000000001') or not exists(select 1 from public.messages where id='85000000-0000-4000-8000-000000000001') or not exists(select 1 from public.competitions where id='86000000-0000-4000-8000-000000000001') or not exists(select 1 from public.waiver_versions where id='88000000-0000-4000-8000-000000000001') then raise exception 'Demo MVP records are incomplete'; end if;
end $$;
begin;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  if exists(select 1 from public.routes where id='70000000-0000-4000-8000-000000000003') then raise exception 'Second-tenant demo route leaked to first-tenant member'; end if;
  if not exists(select 1 from public.routes where id='70000000-0000-4000-8000-000000000001') then raise exception 'First-tenant demo route unavailable'; end if;
end $$;
rollback;
