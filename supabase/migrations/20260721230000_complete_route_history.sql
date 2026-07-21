-- Complete route history: lifecycle timestamps, field/hold diffs and historical analytics.

alter table public.route_versions drop constraint route_versions_change_kind_check;
alter table public.route_versions
  add constraint route_versions_change_kind_check check(change_kind in('create','edit','publish','retire','archive','duplicate','hold_change','wall_change')),
  add column published_at timestamptz,
  add column retired_at timestamptz,
  add column archived_at timestamptz,
  add column wall_width_metres numeric(10,3),
  add column wall_height_metres numeric(10,3),
  add column wall_angle_degrees numeric(6,2),
  add column hold_count integer not null default 0 check(hold_count>=0),
  add column changed_fields text[] not null default '{}',
  add column changes jsonb not null default '{}'::jsonb check(jsonb_typeof(changes)='object');

create index route_versions_gym_changed_at_idx on public.route_versions(gym_id,changed_at desc,route_id);
create index route_versions_gym_kind_changed_idx on public.route_versions(gym_id,change_kind,changed_at desc);
create index route_versions_changed_fields_idx on public.route_versions using gin(changed_fields);

update public.route_versions version set
  hold_count=(select count(*) from public.route_version_holds item where item.route_version_id=version.id and item.gym_id=version.gym_id),
  changed_fields=array['legacy_snapshot'],
  changes=jsonb_build_object('legacySnapshot',true);

create or replace function private.capture_route_version()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  version_id uuid; previous public.route_versions; change_type text; changed text[]:='{}'; detail jsonb:='{}';
  current_hold_ids uuid[]; previous_hold_ids uuid[]; added_hold_ids uuid[]; removed_hold_ids uuid[]; physical_hold_changed boolean:=false; current_tags jsonb;
  current_wall public.walls; previous_wall jsonb; next_wall jsonb;
begin
  if not new.history_ready then return new; end if;
  select * into previous from public.route_versions item where item.route_id=new.id and item.gym_id=new.gym_id order by item.version desc limit 1;
  select * into current_wall from public.walls wall where wall.id=new.wall_id and wall.gym_id=new.gym_id;
  select coalesce(array_agg(item.hold_id order by item.hold_id),'{}'::uuid[]) into current_hold_ids from public.route_holds item where item.route_id=new.id and item.gym_id=new.gym_id;
  select coalesce(jsonb_agg(tag.tag order by tag.tag),'[]'::jsonb) into current_tags from public.route_tags tag where tag.route_id=new.id and tag.gym_id=new.gym_id;
  if previous.id is not null then
    select coalesce(array_agg(item.hold_id order by item.hold_id),'{}'::uuid[]) into previous_hold_ids from public.route_version_holds item where item.route_version_id=previous.id and item.gym_id=new.gym_id;
  else previous_hold_ids:='{}'; end if;
  select coalesce(array_agg(value order by value),'{}'::uuid[]) into added_hold_ids from unnest(current_hold_ids)value where not(value=any(previous_hold_ids));
  select coalesce(array_agg(value order by value),'{}'::uuid[]) into removed_hold_ids from unnest(previous_hold_ids)value where not(value=any(current_hold_ids));
  if previous.id is not null then
    select exists(
      select 1 from public.route_version_holds prior
      join public.wall_holds hold on hold.id=prior.hold_id and hold.gym_id=prior.gym_id
      where prior.route_version_id=previous.id and prior.gym_id=new.gym_id and prior.hold_id=any(current_hold_ids)
        and (prior.category is distinct from hold.category or prior.icon_key is distinct from hold.icon_key
          or prior.position_x_metres is distinct from hold.position_x_metres or prior.position_y_metres is distinct from hold.position_y_metres
          or prior.rotation_degrees is distinct from hold.rotation_degrees or prior.scale_factor is distinct from hold.scale_factor
          or prior.metadata is distinct from hold.metadata)
    ) into physical_hold_changed;
  end if;

  previous_wall:=case when previous.id is null then null else jsonb_build_object('id',previous.wall_id,'name',previous.wall_name,'widthMetres',previous.wall_width_metres,'heightMetres',previous.wall_height_metres,'angleDegrees',previous.wall_angle_degrees) end;
  next_wall:=jsonb_build_object('id',new.wall_id,'name',coalesce(current_wall.name,'Unknown wall'),'widthMetres',current_wall.width_metres,'heightMetres',current_wall.height_metres,'angleDegrees',current_wall.climbing_angle_degrees);

  if previous.id is null then
    changed:=array['name','colour','grade','discipline','status','wall','setter','date_set','planned_removal','holds'];
    detail:=jsonb_build_object('initialSnapshot',true,'holds',jsonb_build_object('added',to_jsonb(current_hold_ids),'removed','[]'::jsonb,'fromCount',0,'toCount',cardinality(current_hold_ids)));
  else
    if previous.name is distinct from new.name then changed:=array_append(changed,'name');detail:=detail||jsonb_build_object('name',jsonb_build_object('from',previous.name,'to',new.name));end if;
    if previous.colour is distinct from new.colour then changed:=array_append(changed,'colour');detail:=detail||jsonb_build_object('colour',jsonb_build_object('from',previous.colour,'to',new.colour));end if;
    if previous.grade is distinct from new.grade or previous.grade_system is distinct from new.grade_system then changed:=array_append(changed,'grade');detail:=detail||jsonb_build_object('grade',jsonb_build_object('from',jsonb_build_object('system',previous.grade_system,'value',previous.grade),'to',jsonb_build_object('system',new.grade_system,'value',new.grade)));end if;
    if previous.route_type is distinct from new.route_type then changed:=array_append(changed,'discipline');detail:=detail||jsonb_build_object('discipline',jsonb_build_object('from',previous.route_type,'to',new.route_type));end if;
    if previous.status is distinct from new.status then changed:=array_append(changed,'status');detail:=detail||jsonb_build_object('status',jsonb_build_object('from',previous.status,'to',new.status));end if;
    if previous.setter_id is distinct from new.setter_id then changed:=array_append(changed,'setter');detail:=detail||jsonb_build_object('setter',jsonb_build_object('fromId',previous.setter_id,'fromName',previous.setter_name,'toId',new.setter_id,'toName',(select profile.display_name from public.profiles profile where profile.id=new.setter_id)));end if;
    if previous.set_on is distinct from new.set_on then changed:=array_append(changed,'date_set');detail:=detail||jsonb_build_object('dateSet',jsonb_build_object('from',previous.set_on,'to',new.set_on));end if;
    if previous.retire_on is distinct from new.retire_on then changed:=array_append(changed,'planned_removal');detail:=detail||jsonb_build_object('plannedRemoval',jsonb_build_object('from',previous.retire_on,'to',new.retire_on));end if;
    if previous.published_at is distinct from new.published_at then changed:=array_append(changed,'date_published');detail:=detail||jsonb_build_object('datePublished',jsonb_build_object('from',previous.published_at,'to',new.published_at));end if;
    if previous.retired_at is distinct from new.retired_at then changed:=array_append(changed,'date_removed');detail:=detail||jsonb_build_object('dateRemoved',jsonb_build_object('from',previous.retired_at,'to',new.retired_at));end if;
    if previous.archived_at is distinct from new.archived_at then changed:=array_append(changed,'date_archived');detail:=detail||jsonb_build_object('dateArchived',jsonb_build_object('from',previous.archived_at,'to',new.archived_at));end if;
    if previous_wall is distinct from next_wall then changed:=array_append(changed,'wall');detail:=detail||jsonb_build_object('wall',jsonb_build_object('from',previous_wall,'to',next_wall));end if;
    if cardinality(added_hold_ids)>0 or cardinality(removed_hold_ids)>0 or physical_hold_changed then
      changed:=array_append(changed,'holds');detail:=detail||jsonb_build_object('holds',jsonb_build_object('added',to_jsonb(added_hold_ids),'removed',to_jsonb(removed_hold_ids),'physicalDetailsChanged',physical_hold_changed,'fromCount',cardinality(previous_hold_ids),'toCount',cardinality(current_hold_ids)));
    end if;
    if previous.description is distinct from new.description then changed:=array_append(changed,'description');end if;
    if previous.overlay is distinct from new.overlay then changed:=array_append(changed,'overlay');end if;
    if previous.tags is distinct from current_tags then changed:=array_append(changed,'tags');detail:=detail||jsonb_build_object('tags',jsonb_build_object('from',previous.tags,'to',current_tags));end if;
  end if;

  change_type:=case
    when tg_op='INSERT' and new.duplicated_from_route_id is not null then 'duplicate'
    when tg_op='INSERT' then 'create'
    when previous.id is null and new.duplicated_from_route_id is not null then 'duplicate'
    when previous.id is null then 'create'
    when old.status<>'archived' and new.status='archived' then 'archive'
    when old.status<>'published' and new.status='published' then 'publish'
    when old.status<>'retired' and new.status='retired' then 'retire'
    when 'wall'=any(changed) then 'wall_change'
    when 'holds'=any(changed) then 'hold_change'
    else 'edit' end;

  insert into public.route_versions(gym_id,route_id,version,change_kind,name,colour,grade_system,grade,route_type,status,wall_id,wall_name,wall_width_metres,wall_height_metres,wall_angle_degrees,setter_id,setter_name,set_on,retire_on,published_at,retired_at,archived_at,description,overlay,tags,hold_count,changed_fields,changes,changed_by)
  values(new.gym_id,new.id,new.history_revision,change_type,new.name,new.colour,new.grade_system,new.grade,new.route_type,new.status,new.wall_id,coalesce(current_wall.name,'Unknown wall'),current_wall.width_metres,current_wall.height_metres,current_wall.climbing_angle_degrees,new.setter_id,(select profile.display_name from public.profiles profile where profile.id=new.setter_id),new.set_on,new.retire_on,new.published_at,new.retired_at,new.archived_at,new.description,new.overlay,current_tags,cardinality(current_hold_ids),changed,detail,auth.uid()) returning id into version_id;
  insert into public.route_version_holds(gym_id,route_version_id,hold_id,category,icon_key,position_x_metres,position_y_metres,rotation_degrees,scale_factor,metadata)
  select new.gym_id,version_id,hold.id,hold.category,hold.icon_key,hold.position_x_metres,hold.position_y_metres,hold.rotation_degrees,hold.scale_factor,hold.metadata from public.route_holds assignment join public.wall_holds hold on hold.id=assignment.hold_id and hold.gym_id=assignment.gym_id where assignment.route_id=new.id and assignment.gym_id=new.gym_id;
  return new;
end;
$$;

create or replace function private.capture_routes_after_physical_hold_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare selected_route_id uuid;
begin
  if old.category is not distinct from new.category and old.icon_key is not distinct from new.icon_key
    and old.position_x_metres is not distinct from new.position_x_metres and old.position_y_metres is not distinct from new.position_y_metres
    and old.rotation_degrees is not distinct from new.rotation_degrees and old.scale_factor is not distinct from new.scale_factor
    and old.metadata is not distinct from new.metadata then return null; end if;
  for selected_route_id in select assignment.route_id from public.route_holds assignment join public.routes route on route.id=assignment.route_id and route.gym_id=assignment.gym_id where assignment.gym_id=new.gym_id and assignment.hold_id=new.id and route.status<>'archived' order by assignment.route_id loop
    if not exists(select 1 from public.route_versions version where version.route_id=selected_route_id and version.gym_id=new.gym_id and version.change_kind='hold_change' and version.changed_at>=transaction_timestamp()) then
      update public.routes set updated_at=updated_at where id=selected_route_id and gym_id=new.gym_id;
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger wall_holds_capture_route_history
after update on public.wall_holds deferrable initially deferred
for each row execute function private.capture_routes_after_physical_hold_change();

create or replace function private.capture_routes_after_wall_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare selected_route_id uuid;
begin
  if old.name is not distinct from new.name and old.width_metres is not distinct from new.width_metres and old.height_metres is not distinct from new.height_metres and old.climbing_angle_degrees is not distinct from new.climbing_angle_degrees then return null; end if;
  for selected_route_id in select route.id from public.routes route where route.gym_id=new.gym_id and route.wall_id=new.id and route.status<>'archived' order by route.id loop
    if not exists(select 1 from public.route_versions version where version.route_id=selected_route_id and version.gym_id=new.gym_id and version.change_kind='wall_change' and version.changed_at>=transaction_timestamp()) then
      update public.routes set updated_at=updated_at where id=selected_route_id and gym_id=new.gym_id;
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger walls_capture_route_history
after update on public.walls deferrable initially deferred
for each row execute function private.capture_routes_after_wall_change();

create or replace function private.capture_route_history_after_tag_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_route_id uuid:=coalesce(new.route_id,old.route_id);target_gym_id uuid:=coalesce(new.gym_id,old.gym_id);
begin
  if exists(select 1 from public.routes route where route.id=target_route_id and route.gym_id=target_gym_id and route.status<>'archived')
    and (select version.tags from public.route_versions version where version.route_id=target_route_id and version.gym_id=target_gym_id order by version.version desc limit 1)
      is distinct from (select coalesce(jsonb_agg(tag.tag order by tag.tag),'[]'::jsonb) from public.route_tags tag where tag.route_id=target_route_id and tag.gym_id=target_gym_id) then
    update public.routes set updated_at=updated_at where id=target_route_id and gym_id=target_gym_id;
  end if;
  return null;
end;
$$;

create constraint trigger route_tags_capture_route_history
after insert or delete on public.route_tags deferrable initially deferred
for each row execute function private.capture_route_history_after_tag_change();

create or replace function public.archive_hold_based_route(target_gym_id uuid,target_route_id uuid,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.routes;
begin
  if not private.has_gym_capability(target_gym_id,'routes.manage') then raise insufficient_privilege; end if;
  select * into saved from public.routes where id=target_route_id and gym_id=target_gym_id for update;
  if saved.id is null then raise exception 'Route not found' using errcode='22023'; end if;
  if saved.status='archived' then return jsonb_build_object('route_id',saved.id,'revision',saved.history_revision,'status','archived'); end if;
  if saved.history_revision<>expected_revision then raise exception 'Route changed in another session' using errcode='40001'; end if;
  update public.routes set status='archived',retired_at=coalesce(retired_at,now()),archived_at=now() where id=saved.id and gym_id=target_gym_id returning * into saved;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','route.archived','route',saved.id,jsonb_build_object('revision',saved.history_revision,'removed_at',saved.retired_at));
  return jsonb_build_object('route_id',saved.id,'revision',saved.history_revision,'status','archived');
end;
$$;

create or replace function public.get_route_history_analytics(target_gym_id uuid,date_from date,date_to date,target_wall_id uuid default null,target_setter_id uuid default null,target_route_type text default null)
returns table(route_id uuid,route_name text,version bigint,change_kind text,changed_at timestamptz,changed_by_name text,changed_fields text[],changes jsonb,grade text,grade_system text,setter_name text,wall_name text,set_on date,date_removed timestamptz,date_archived timestamptz,hold_count integer)
language sql stable security definer set search_path='' as $$
  select history.route_id,coalesce(history.name,history.colour||' '||history.grade),history.version,history.change_kind,history.changed_at,coalesce(actor.display_name,'System'),history.changed_fields,history.changes,history.grade,history.grade_system,coalesce(history.setter_name,'Unassigned'),history.wall_name,history.set_on,history.retired_at,history.archived_at,history.hold_count
  from public.route_versions history left join public.profiles actor on actor.id=history.changed_by
  where history.gym_id=target_gym_id and date_to>=date_from and date_to-date_from<=366
    and history.changed_at>=date_from::timestamptz and history.changed_at<(date_to+1)::timestamptz
    and(target_wall_id is null or history.wall_id=target_wall_id)
    and(target_setter_id is null or history.setter_id=target_setter_id)
    and(target_route_type is null or history.route_type=target_route_type)
    and private.has_gym_capability(target_gym_id,'routes.manage')
  order by history.changed_at desc,history.route_id,history.version desc;
$$;

revoke all on function public.get_route_history_analytics(uuid,date,date,uuid,uuid,text) from public,anon;
grant execute on function public.get_route_history_analytics(uuid,date,date,uuid,uuid,text) to authenticated;

comment on function public.get_route_history_analytics(uuid,date,date,uuid,uuid,text) is 'Date-scoped immutable route modifications for historical route-setting analytics.';
