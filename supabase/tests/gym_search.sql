-- Prompt 34: permission-aware, bounded tenant search.
begin;set local role service_role;insert into public.gyms(id,slug,name)values('30000000-0000-4000-8000-000000000099','search-isolation-gym','Search Isolation Gym');
insert into public.community_posts(id,gym_id,author_id,title,body,moderation_status)values('83000000-0000-4000-8000-000000000099','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Hidden search secret','Needle private moderation content','hidden');
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin
  if not exists(select 1 from public.search_gym_content('30000000-0000-4000-8000-000000000001','Lime',20)where result_kind='route'and title='Lime and Punishment')then raise exception'Published route was not searchable';end if;
  if exists(select 1 from public.search_gym_content('30000000-0000-4000-8000-000000000001','Needle',20))then raise exception'Hidden content appeared in search';end if;
  begin perform public.search_gym_content('30000000-0000-4000-8000-000000000099','Search',20);raise exception'Cross-tenant search succeeded';exception when insufficient_privilege then null;end;
  begin perform public.search_gym_content('30000000-0000-4000-8000-000000000001','x',20);raise exception'Unbounded short search succeeded';exception when invalid_parameter_value then null;end;
end$$;rollback;
