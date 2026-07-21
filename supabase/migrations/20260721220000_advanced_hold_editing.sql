-- Atomic route membership editing and recoverable physical hold replacement/removal.

create or replace function public.save_hold_route_assignments(
  target_gym_id uuid,
  target_face_id uuid,
  expected_route_revisions jsonb,
  assignment_payload jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; selected_hold_id uuid; desired_ids uuid[]; current_ids uuid[]; affected_ids uuid[] := '{}'; selected_route_id uuid;
begin
  if not private.has_gym_capability(target_gym_id,'routes.manage') then raise insufficient_privilege; end if;
  if jsonb_typeof(expected_route_revisions)<>'object' or jsonb_typeof(assignment_payload)<>'array'
    or jsonb_array_length(assignment_payload)>100
    or jsonb_array_length(assignment_payload)<>(select count(distinct value->>'holdId') from jsonb_array_elements(assignment_payload)value)
    then raise exception 'Invalid hold assignment payload' using errcode='22023'; end if;

  for item in select value from jsonb_array_elements(assignment_payload) loop
    selected_hold_id := (item->>'holdId')::uuid;
    if jsonb_typeof(item->'routeIds')<>'array' then raise exception 'Invalid hold assignment payload' using errcode='22023'; end if;
    select coalesce(array_agg(value::uuid order by value::uuid),'{}'::uuid[]) into desired_ids from jsonb_array_elements_text(item->'routeIds') value;
    if cardinality(desired_ids)>1000 or cardinality(desired_ids)<>(select count(distinct value) from unnest(desired_ids)value) then raise exception 'Route assignments must be unique' using errcode='22023'; end if;
    if not exists(select 1 from public.wall_holds hold where hold.id=selected_hold_id and hold.gym_id=target_gym_id and hold.wall_id=target_face_id and hold.archived_at is null) then raise exception 'Active physical hold not found' using errcode='22023'; end if;
    if cardinality(desired_ids)<>(select count(*) from public.routes route where route.id=any(desired_ids) and route.gym_id=target_gym_id and route.wall_id=target_face_id and route.status<>'archived') then raise exception 'Every route must be active on this face' using errcode='22023'; end if;
    select coalesce(array_agg(assignment.route_id order by assignment.route_id),'{}'::uuid[]) into current_ids
    from public.route_holds assignment join public.routes route on route.id=assignment.route_id and route.gym_id=assignment.gym_id
    where assignment.gym_id=target_gym_id and assignment.hold_id=selected_hold_id and route.status<>'archived';
    affected_ids:=affected_ids||array(select value from unnest(current_ids||desired_ids)value where not(value=any(current_ids) and value=any(desired_ids)));
  end loop;
  select coalesce(array_agg(distinct value order by value),'{}'::uuid[]) into affected_ids from unnest(affected_ids)value;

  perform 1 from public.routes route where route.gym_id=target_gym_id and route.id=any(affected_ids) order by route.id for update;
  foreach selected_route_id in array affected_ids loop
    if (expected_route_revisions->>selected_route_id::text)::bigint is distinct from (select route.history_revision from public.routes route where route.id=selected_route_id and route.gym_id=target_gym_id) then
      raise exception 'Route changed in another session' using errcode='40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(assignment_payload) loop
    selected_hold_id := (item->>'holdId')::uuid;
    select coalesce(array_agg(value::uuid),'{}'::uuid[]) into desired_ids from jsonb_array_elements_text(item->'routeIds')value;
    delete from public.route_holds assignment using public.routes route
    where assignment.route_id=route.id and assignment.gym_id=route.gym_id
      and assignment.gym_id=target_gym_id and assignment.hold_id=selected_hold_id
      and route.status<>'archived' and not(assignment.route_id=any(desired_ids));
    insert into public.route_holds(gym_id,route_id,hold_id,assigned_by)
    select target_gym_id,value,selected_hold_id,auth.uid() from unnest(desired_ids)value
    on conflict(route_id,hold_id) do nothing;
  end loop;
  update public.routes set updated_at=updated_at where gym_id=target_gym_id and id=any(affected_ids);
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','hold.route_assignments_updated','wall_face',target_face_id,jsonb_build_object('route_ids',to_jsonb(affected_ids),'hold_count',jsonb_array_length(assignment_payload)));
  return coalesce((select jsonb_object_agg(route.id::text,route.history_revision) from public.routes route where route.gym_id=target_gym_id and route.id=any(affected_ids)),'{}'::jsonb);
exception when invalid_text_representation or null_value_not_allowed or cardinality_violation then
  raise exception 'Invalid hold assignment payload' using errcode='22023';
end;
$$;

create or replace function public.replace_physical_hold(target_gym_id uuid,target_hold_id uuid,replacement_hold_id uuid,expected_holds_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old_hold public.wall_holds; face public.walls; affected_ids uuid[];
begin
  if not private.has_gym_role(target_gym_id,array['owner']) then raise insufficient_privilege; end if;
  if replacement_hold_id=target_hold_id or exists(select 1 from public.wall_holds where id=replacement_hold_id) then raise exception 'Replacement hold identifier is unavailable' using errcode='22023'; end if;
  select * into old_hold from public.wall_holds where id=target_hold_id and gym_id=target_gym_id and archived_at is null for update;
  if old_hold.id is null then raise exception 'Physical hold not found' using errcode='22023'; end if;
  select * into face from public.walls where id=old_hold.wall_id and gym_id=target_gym_id for update;
  if face.holds_revision<>expected_holds_revision then raise exception 'Hold library changed in another session' using errcode='40001'; end if;
  select coalesce(array_agg(assignment.route_id order by assignment.route_id),'{}'::uuid[]) into affected_ids
  from public.route_holds assignment join public.routes route on route.id=assignment.route_id and route.gym_id=assignment.gym_id
  where assignment.hold_id=old_hold.id and assignment.gym_id=target_gym_id and route.status<>'archived';
  perform 1 from public.routes where gym_id=target_gym_id and id=any(affected_ids) order by id for update;
  insert into public.wall_holds(id,gym_id,wall_id,category,icon_key,position_x_metres,position_y_metres,rotation_degrees,scale_factor,metadata,created_by)
  values(replacement_hold_id,old_hold.gym_id,old_hold.wall_id,old_hold.category,old_hold.icon_key,old_hold.position_x_metres,old_hold.position_y_metres,old_hold.rotation_degrees,old_hold.scale_factor,
    jsonb_set(jsonb_set(old_hold.metadata,'{purchaseDate}','""'::jsonb,true),'{condition}','"new"'::jsonb,true),auth.uid());
  insert into public.route_holds(gym_id,route_id,hold_id,assigned_by)
  select target_gym_id,value,replacement_hold_id,auth.uid() from unnest(affected_ids)value;
  delete from public.route_holds where gym_id=target_gym_id and hold_id=old_hold.id and route_id=any(affected_ids);
  update public.routes set updated_at=updated_at where gym_id=target_gym_id and id=any(affected_ids);
  update public.wall_holds set archived_at=now() where id=old_hold.id and gym_id=target_gym_id;
  update public.walls set holds_revision=holds_revision+1 where id=old_hold.wall_id and gym_id=target_gym_id returning * into face;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','hold.replaced','wall_hold',replacement_hold_id,jsonb_build_object('replaced_hold_id',old_hold.id,'route_ids',to_jsonb(affected_ids)));
  return jsonb_build_object('hold_id',replacement_hold_id,'revision',face.holds_revision);
end;
$$;

create or replace function public.retire_physical_hold(target_gym_id uuid,target_hold_id uuid,expected_holds_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare selected public.wall_holds; face public.walls; affected_ids uuid[];
begin
  if not private.has_gym_role(target_gym_id,array['owner']) then raise insufficient_privilege; end if;
  select * into selected from public.wall_holds where id=target_hold_id and gym_id=target_gym_id and archived_at is null for update;
  if selected.id is null then raise exception 'Physical hold not found' using errcode='22023'; end if;
  select * into face from public.walls where id=selected.wall_id and gym_id=target_gym_id for update;
  if face.holds_revision<>expected_holds_revision then raise exception 'Hold library changed in another session' using errcode='40001'; end if;
  select coalesce(array_agg(assignment.route_id order by assignment.route_id),'{}'::uuid[]) into affected_ids
  from public.route_holds assignment join public.routes route on route.id=assignment.route_id and route.gym_id=assignment.gym_id
  where assignment.hold_id=selected.id and assignment.gym_id=target_gym_id and route.status<>'archived';
  perform 1 from public.routes where gym_id=target_gym_id and id=any(affected_ids) order by id for update;
  delete from public.route_holds where gym_id=target_gym_id and hold_id=selected.id and route_id=any(affected_ids);
  update public.routes set updated_at=updated_at where gym_id=target_gym_id and id=any(affected_ids);
  update public.wall_holds set archived_at=now(),condition='retired' where id=selected.id and gym_id=target_gym_id;
  update public.walls set holds_revision=holds_revision+1 where id=selected.wall_id and gym_id=target_gym_id returning * into face;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','hold.retired','wall_hold',selected.id,jsonb_build_object('route_ids',to_jsonb(affected_ids)));
  return jsonb_build_object('hold_id',selected.id,'revision',face.holds_revision);
end;
$$;

revoke all on function public.save_hold_route_assignments(uuid,uuid,jsonb,jsonb) from public,anon;
revoke all on function public.replace_physical_hold(uuid,uuid,uuid,bigint) from public,anon;
revoke all on function public.retire_physical_hold(uuid,uuid,bigint) from public,anon;
grant execute on function public.save_hold_route_assignments(uuid,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.replace_physical_hold(uuid,uuid,uuid,bigint) to authenticated;
grant execute on function public.retire_physical_hold(uuid,uuid,bigint) to authenticated;
