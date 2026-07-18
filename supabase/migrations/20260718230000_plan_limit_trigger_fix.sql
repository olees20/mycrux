-- Prompt 43 rehearsal fix: do not inspect UPDATE-only OLD fields during plan-limited INSERTs.
create or replace function private.enforce_plan_feature()
returns trigger language plpgsql security definer set search_path='' as $$
declare feature text:=tg_argv[0];usage_count integer;allowed integer;adds_usage boolean;
begin
  if not private.feature_available(new.gym_id,feature) then raise exception 'Feature % is not available on this gym plan',feature using errcode='42501';end if;
  allowed:=private.feature_limit(new.gym_id,feature);if allowed is null then return new;end if;
  usage_count:=case feature
    when 'staff_seats' then(select count(*)from public.gym_memberships where gym_id=new.gym_id and status='active'and role in('owner','staff','route_setter'))
    when 'active_members' then(select count(*)from public.gym_memberships where gym_id=new.gym_id and status='active')
    when 'routes' then(select count(*)from public.routes where gym_id=new.gym_id and archived_at is null)
    when 'wall_images' then(select count(*)from public.wall_images where gym_id=new.gym_id and archived_at is null)
    else 0 end;
  adds_usage:=tg_op='INSERT';
  if tg_op='UPDATE' then
    adds_usage:=case feature
      when 'staff_seats' then not(old.status='active'and old.role in('owner','staff','route_setter'))
      when 'active_members' then old.status<>'active'
      else false end;
  end if;
  if adds_usage and usage_count>=allowed then raise exception 'Plan limit reached for %',feature using errcode='23514';end if;
  return new;
end$$;
