-- Prompt 20: private-by-default ascent logbook, sessions, snapshots and media.

alter table public.ascent_logs drop constraint ascent_logs_ascent_type_check;
update public.ascent_logs set ascent_type='attempted' where ascent_type='attempt';
alter table public.ascent_logs add constraint ascent_logs_ascent_type_check check(ascent_type in ('flash','onsight','redpoint','repeat','attempted','project'));
alter table public.ascent_logs add column session_date date not null default current_date;
alter table public.ascent_logs add column visibility text not null default 'private' check(visibility in ('private','gym','public'));
alter table public.ascent_logs add column route_name_snapshot text;
alter table public.ascent_logs add column route_colour_snapshot text not null default 'Unknown';
alter table public.ascent_logs add column route_grade_snapshot text not null default 'Unknown';
alter table public.ascent_logs add column route_grade_system_snapshot text not null default 'Unknown';
alter table public.ascent_logs add column wall_name_snapshot text not null default 'Unknown wall';
update public.ascent_logs ascent set route_name_snapshot=route.name,route_colour_snapshot=route.colour,route_grade_snapshot=route.grade,route_grade_system_snapshot=route.grade_system,wall_name_snapshot=wall.name from public.routes route join public.walls wall on wall.id=route.wall_id and wall.gym_id=route.gym_id where ascent.route_id=route.id and ascent.gym_id=route.gym_id;

create table public.climbing_sessions(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,profile_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,started_at timestamptz,ended_at timestamptz,notes text check(notes is null or char_length(notes)<=1000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint climbing_sessions_id_gym_profile_key unique(id,gym_id,profile_id),constraint climbing_sessions_time_check check(ended_at is null or started_at is null or ended_at>=started_at)
);
create index climbing_sessions_profile_date_idx on public.climbing_sessions(profile_id,session_date desc,created_at desc);
create index climbing_sessions_gym_date_idx on public.climbing_sessions(gym_id,session_date desc);
create trigger climbing_sessions_set_updated_at before update on public.climbing_sessions for each row execute function public.set_updated_at();
alter table public.climbing_sessions enable row level security;alter table public.climbing_sessions force row level security;
grant select on public.climbing_sessions to authenticated;grant all on public.climbing_sessions to service_role;
create policy climbing_sessions_select_self on public.climbing_sessions for select to authenticated using(profile_id=auth.uid());

alter table public.ascent_logs add column session_id uuid;
alter table public.ascent_logs add constraint ascent_logs_session_fkey foreign key(session_id,gym_id,profile_id) references public.climbing_sessions(id,gym_id,profile_id) on delete restrict;

create table public.ascent_media(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id) on delete cascade,ascent_id uuid not null,profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,media_type text not null check(media_type in ('image','video')),created_at timestamptz not null default now(),
  constraint ascent_media_ascent_fkey foreign key(ascent_id,gym_id) references public.ascent_logs(id,gym_id) on delete cascade,constraint ascent_media_path_check check(storage_path ~ ('^'||gym_id::text||'/'||profile_id::text||'/[0-9a-f-]{36}\.(png|jpg|webp|mp4)$'))
);
create index ascent_media_ascent_idx on public.ascent_media(ascent_id,created_at);
create index ascent_media_gym_ascent_idx on public.ascent_media(gym_id,ascent_id);
alter table public.ascent_media enable row level security;alter table public.ascent_media force row level security;
grant select on public.ascent_media to authenticated;grant all on public.ascent_media to service_role;

drop policy ascent_logs_select_self on public.ascent_logs;
create policy ascent_logs_select_visible on public.ascent_logs for select to authenticated using(
  profile_id=auth.uid() or (deleted_at is null and visibility in ('gym','public') and private.current_membership_id(gym_id) is not null)
);
drop policy ascent_logs_insert_self on public.ascent_logs;drop policy ascent_logs_update_self on public.ascent_logs;drop policy ascent_logs_delete_self on public.ascent_logs;
revoke insert,update,delete on public.ascent_logs from authenticated;
create policy ascent_media_select_visible on public.ascent_media for select to authenticated using(exists(select 1 from public.ascent_logs ascent where ascent.id=ascent_id and ascent.gym_id=ascent_media.gym_id));

create or replace function public.save_ascent(target_gym_id uuid,target_route_id uuid,target_ascent_id uuid,target_session_id uuid,target_session_date date,target_outcome text,target_attempts integer,target_notes text,target_visibility text)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected_route public.routes; selected_wall public.walls; selected_ascent public.ascent_logs; chosen_session uuid;begin
  if target_outcome not in ('flash','onsight','redpoint','repeat','attempted','project') or target_attempts not between 1 and 999 or target_visibility not in ('private','gym','public') or target_session_date is null or target_session_date>current_date or char_length(coalesce(target_notes,''))>2000 then raise exception 'Ascent details are invalid' using errcode='22023';end if;
  if private.current_membership_id(target_gym_id) is null then raise exception 'Active gym membership is required' using errcode='42501';end if;
  if target_ascent_id is not null then
    select * into selected_ascent from public.ascent_logs where id=target_ascent_id and gym_id=target_gym_id and profile_id=auth.uid() and deleted_at is null for update;
    if selected_ascent.id is null then raise exception 'Editable ascent was not found' using errcode='22023';end if;
    if selected_ascent.created_at<now()-interval '30 days' then raise exception 'Ascents can be edited for 30 days' using errcode='P0001';end if;
    if target_route_id<>selected_ascent.route_id then raise exception 'The route on an ascent cannot be changed' using errcode='22023';end if;
  end if;
  select * into selected_route from public.routes where id=target_route_id and gym_id=target_gym_id and status in ('published','retired');
  if selected_route.id is null then raise exception 'Route was not found in this gym' using errcode='22023';end if;
  select * into selected_wall from public.walls where id=selected_route.wall_id and gym_id=target_gym_id;
  if target_session_id is null then insert into public.climbing_sessions(gym_id,profile_id,session_date,started_at) values(target_gym_id,auth.uid(),target_session_date,target_session_date::timestamptz+interval '12 hours') returning id into chosen_session;
  else select id into chosen_session from public.climbing_sessions where id=target_session_id and gym_id=target_gym_id and profile_id=auth.uid() and session_date=target_session_date;if chosen_session is null then raise exception 'Session was not found' using errcode='22023';end if;end if;
  if target_ascent_id is null then
    insert into public.ascent_logs(gym_id,route_id,profile_id,session_id,session_date,climbed_at,ascent_type,attempts,notes,is_private,visibility,route_name_snapshot,route_colour_snapshot,route_grade_snapshot,route_grade_system_snapshot,wall_name_snapshot)
    values(target_gym_id,selected_route.id,auth.uid(),chosen_session,target_session_date,target_session_date::timestamptz+interval '12 hours',target_outcome,target_attempts,nullif(trim(target_notes),''),target_visibility='private',target_visibility,selected_route.name,selected_route.colour,selected_route.grade,selected_route.grade_system,selected_wall.name) returning id into target_ascent_id;
  else update public.ascent_logs set session_id=chosen_session,session_date=target_session_date,climbed_at=target_session_date::timestamptz+interval '12 hours',ascent_type=target_outcome,attempts=target_attempts,notes=nullif(trim(target_notes),''),is_private=target_visibility='private',visibility=target_visibility where id=target_ascent_id;end if;
  return target_ascent_id;
end;$$;

create or replace function public.delete_ascent(target_gym_id uuid,target_ascent_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$begin update public.ascent_logs set deleted_at=now() where id=target_ascent_id and gym_id=target_gym_id and profile_id=auth.uid() and deleted_at is null returning id into target_ascent_id;if target_ascent_id is null then raise exception 'Ascent was not found' using errcode='22023';end if;return target_ascent_id;end;$$;

create or replace function public.attach_ascent_media(target_gym_id uuid,target_ascent_id uuid,object_path text,object_media_type text)
returns uuid language plpgsql security definer set search_path='' as $$declare media_id uuid;begin if object_media_type not in ('image','video') or object_path !~ ('^'||target_gym_id::text||'/'||auth.uid()::text||'/[0-9a-f-]{36}\.(png|jpg|webp|mp4)$') or not exists(select 1 from public.ascent_logs where id=target_ascent_id and gym_id=target_gym_id and profile_id=auth.uid() and deleted_at is null) then raise exception 'Ascent media is invalid' using errcode='22023';end if;insert into public.ascent_media(gym_id,ascent_id,profile_id,storage_path,media_type)values(target_gym_id,target_ascent_id,auth.uid(),object_path,object_media_type)returning id into media_id;return media_id;end;$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ascent-media','ascent-media',false,20971520,array['image/png','image/jpeg','image/webp','video/mp4']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy ascent_media_objects_select on storage.objects for select to authenticated using(bucket_id='ascent-media' and exists(select 1 from public.ascent_media media join public.ascent_logs ascent on ascent.id=media.ascent_id where media.storage_path=name and (ascent.profile_id=auth.uid() or (ascent.deleted_at is null and ascent.visibility in ('gym','public') and private.current_membership_id(ascent.gym_id) is not null))));
create policy ascent_media_objects_insert on storage.objects for insert to authenticated with check(bucket_id='ascent-media' and (storage.foldername(name))[1] in (select gym_id::text from public.gym_memberships where profile_id=auth.uid() and status='active') and (storage.foldername(name))[2]=auth.uid()::text);
create policy ascent_media_objects_delete on storage.objects for delete to authenticated using(bucket_id='ascent-media' and (storage.foldername(name))[2]=auth.uid()::text);

revoke all on function public.save_ascent(uuid,uuid,uuid,uuid,date,text,integer,text,text) from public,anon;revoke all on function public.delete_ascent(uuid,uuid) from public,anon;revoke all on function public.attach_ascent_media(uuid,uuid,text,text) from public,anon;
grant execute on function public.save_ascent(uuid,uuid,uuid,uuid,date,text,integer,text,text) to authenticated,service_role;grant execute on function public.delete_ascent(uuid,uuid) to authenticated,service_role;grant execute on function public.attach_ascent_media(uuid,uuid,text,text) to authenticated,service_role;

create or replace function public.get_route_public_metrics(target_gym_id uuid,target_route_id uuid)
returns jsonb language plpgsql security definer stable set search_path='' as $$begin if private.current_membership_id(target_gym_id) is null or not private.can_read_route(target_route_id,target_gym_id) then raise exception 'Published route access is required' using errcode='42501';end if;return jsonb_build_object('favourites',(select count(*) from public.favourites where gym_id=target_gym_id and route_id=target_route_id),'ascents',(select count(*) from public.ascent_logs where gym_id=target_gym_id and route_id=target_route_id and deleted_at is null and ascent_type not in ('attempted','project')),'loved',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='loved_it' and archived_at is null),'grade_soft',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_soft' and archived_at is null),'grade_right',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_right' and archived_at is null),'grade_hard',(select count(*) from public.route_feedback where gym_id=target_gym_id and route_id=target_route_id and feedback_kind='grade_hard' and archived_at is null));end;$$;
