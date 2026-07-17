-- Prompt 21: idempotent member achievements based on gym-local session dates.

create table public.member_achievements(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null check(achievement_key ~ '^[a-z0-9_:-]{1,120}$'),title text not null check(char_length(title) between 1 and 160),description text not null check(char_length(description) between 1 and 500),context jsonb not null default '{}'::jsonb check(jsonb_typeof(context)='object'),awarded_at timestamptz not null default now(),
  constraint member_achievements_unique_key unique(gym_id,profile_id,achievement_key),constraint member_achievements_id_gym_key unique(id,gym_id)
);
create index member_achievements_gym_profile_idx on public.member_achievements(gym_id,profile_id,awarded_at desc);
alter table public.member_achievements enable row level security;alter table public.member_achievements force row level security;
grant select on public.member_achievements to authenticated;grant all on public.member_achievements to service_role;
create policy member_achievements_select_self on public.member_achievements for select to authenticated using(profile_id=auth.uid());

create or replace function public.process_my_achievements(target_gym_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare inserted_count integer:=0;changed integer;flash_grade record;begin
  if private.current_membership_id(target_gym_id) is null then raise exception 'Active gym membership is required' using errcode='42501';end if;
  if exists(select 1 from public.ascent_logs where gym_id=target_gym_id and profile_id=auth.uid() and deleted_at is null) then
    insert into public.member_achievements(gym_id,profile_id,achievement_key,title,description)values(target_gym_id,auth.uid(),'first_logged_climb','First logged climb','Logged the first climb or project in this gym.')on conflict(gym_id,profile_id,achievement_key)do nothing;get diagnostics changed=row_count;inserted_count:=inserted_count+changed;
  end if;
  for flash_grade in select distinct route_grade_system_snapshot system,route_grade_snapshot grade from public.ascent_logs where gym_id=target_gym_id and profile_id=auth.uid() and deleted_at is null and ascent_type='flash' loop
    insert into public.member_achievements(gym_id,profile_id,achievement_key,title,description,context)values(target_gym_id,auth.uid(),'first_flash_grade:'||substr(encode(extensions.digest(flash_grade.system||':'||flash_grade.grade,'sha256'),'hex'),1,24),'First flash at '||flash_grade.grade,'Recorded a first flash at this grade.',jsonb_build_object('grade_system',flash_grade.system,'grade',flash_grade.grade))on conflict(gym_id,profile_id,achievement_key)do nothing;get diagnostics changed=row_count;inserted_count:=inserted_count+changed;
  end loop;
  if (select count(*) from public.climbing_sessions where gym_id=target_gym_id and profile_id=auth.uid())>=10 then
    insert into public.member_achievements(gym_id,profile_id,achievement_key,title,description,context)values(target_gym_id,auth.uid(),'visit_10','Ten sessions','Logged ten climbing sessions at this gym.',jsonb_build_object('milestone',10))on conflict(gym_id,profile_id,achievement_key)do nothing;get diagnostics changed=row_count;inserted_count:=inserted_count+changed;
  end if;
  if exists(with weeks as(select distinct date_trunc('week',session_date::timestamp)::date week from public.climbing_sessions where gym_id=target_gym_id and profile_id=auth.uid())select 1 from weeks first_week join weeks second_week on second_week.week=first_week.week+7 join weeks third_week on third_week.week=first_week.week+14 join weeks fourth_week on fourth_week.week=first_week.week+21) then
    insert into public.member_achievements(gym_id,profile_id,achievement_key,title,description,context)values(target_gym_id,auth.uid(),'consistent_4_weeks','Four consistent weeks','Logged at least one session in four consecutive Monday-to-Sunday weeks.',jsonb_build_object('weeks',4))on conflict(gym_id,profile_id,achievement_key)do nothing;get diagnostics changed=row_count;inserted_count:=inserted_count+changed;
  end if;
  return inserted_count;
end;$$;
revoke all on function public.process_my_achievements(uuid) from public,anon;grant execute on function public.process_my_achievements(uuid) to authenticated,service_role;
