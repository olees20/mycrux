-- Every wall_holds row is the canonical physical inventory object.

alter table public.wall_holds
  add column manufacturer text check (manufacturer is null or char_length(manufacturer) <= 100),
  add column model text check (model is null or char_length(model) <= 120),
  add column colour text not null default '#65a30d' check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  add column purchased_on date,
  add column condition text not null default 'good' check (condition in ('new','good','fair','worn','damaged','retired'));

update public.wall_holds set
  manufacturer=nullif(trim(metadata->>'manufacturer'),''),
  model=nullif(trim(metadata->>'model'),''),
  colour=case when coalesce(metadata->>'colour','') ~ '^#[0-9A-Fa-f]{6}$' then metadata->>'colour' else '#65a30d' end,
  purchased_on=case when coalesce(metadata->>'purchaseDate','') ~ '^\d{4}-\d{2}-\d{2}$' then (metadata->>'purchaseDate')::date end,
  condition=case when metadata->>'condition' in ('new','good','fair','worn','damaged','retired') then metadata->>'condition' else 'good' end;

create table public.hold_inventory_events (
  id bigint generated always as identity primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  hold_id uuid not null,
  event_type text not null check (event_type in (
    'inventory_created','details_updated','position_updated','wall_moved','archived','restored','route_assigned','route_unassigned'
  )),
  wall_id uuid,
  route_id uuid,
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=32768),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint hold_inventory_events_hold_fkey
    foreign key(hold_id,gym_id) references public.wall_holds(id,gym_id) on delete restrict,
  constraint hold_inventory_events_route_fkey
    foreign key(route_id,gym_id) references public.routes(id,gym_id) on delete restrict
);

create index hold_inventory_events_gym_hold_time_idx
  on public.hold_inventory_events(gym_id,hold_id,created_at desc,id desc);
create index hold_inventory_events_gym_route_time_idx
  on public.hold_inventory_events(gym_id,route_id,created_at desc)
  where route_id is not null;

alter table public.hold_inventory_events enable row level security;
create policy hold_inventory_events_select_manager on public.hold_inventory_events
for select to authenticated using (private.has_gym_capability(gym_id,'routes.manage'));
revoke insert,update,delete on public.hold_inventory_events from authenticated;
grant select on public.hold_inventory_events to authenticated;

drop policy wall_holds_select_member on public.wall_holds;
create policy wall_holds_select_member on public.wall_holds
for select to authenticated using (
  private.has_gym_capability(gym_id,'routes.manage')
  or (private.current_membership_id(gym_id) is not null and archived_at is null)
);

create or replace function private.hold_inventory_snapshot(hold public.wall_holds)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object(
    'category',hold.category,'icon_key',hold.icon_key,
    'manufacturer',hold.manufacturer,'model',hold.model,'colour',hold.colour,
    'purchased_on',hold.purchased_on,'condition',hold.condition,
    'wall_id',hold.wall_id,'position_x_metres',hold.position_x_metres,
    'position_y_metres',hold.position_y_metres,'rotation_degrees',hold.rotation_degrees,
    'scale_factor',hold.scale_factor,'metadata',hold.metadata
  );
$$;

create or replace function private.sync_hold_inventory_columns()
returns trigger language plpgsql set search_path='' as $$
begin
  new.manufacturer := nullif(trim(coalesce(new.metadata->>'manufacturer','')),'');
  new.model := nullif(trim(coalesce(new.metadata->>'model','')),'');
  new.colour := coalesce(nullif(new.metadata->>'colour',''),new.colour,'#65a30d');
  new.purchased_on := nullif(new.metadata->>'purchaseDate','')::date;
  new.condition := coalesce(nullif(new.metadata->>'condition',''),new.condition,'good');
  return new;
end;
$$;

create trigger wall_holds_sync_inventory
before insert or update of metadata on public.wall_holds
for each row execute function private.sync_hold_inventory_columns();

create or replace function private.capture_hold_inventory_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare change_type text;
begin
  if tg_op='INSERT' then change_type := 'inventory_created';
  elsif old.archived_at is null and new.archived_at is not null then change_type := 'archived';
  elsif old.archived_at is not null and new.archived_at is null then change_type := 'restored';
  elsif old.wall_id is distinct from new.wall_id then change_type := 'wall_moved';
  elsif old.position_x_metres is distinct from new.position_x_metres
    or old.position_y_metres is distinct from new.position_y_metres
    or old.rotation_degrees is distinct from new.rotation_degrees
    or old.scale_factor is distinct from new.scale_factor then change_type := 'position_updated';
  elsif old.category is distinct from new.category or old.icon_key is distinct from new.icon_key
    or old.manufacturer is distinct from new.manufacturer or old.model is distinct from new.model
    or old.colour is distinct from new.colour or old.purchased_on is distinct from new.purchased_on
    or old.condition is distinct from new.condition or old.metadata is distinct from new.metadata then change_type := 'details_updated';
  else return new;
  end if;
  insert into public.hold_inventory_events(gym_id,hold_id,event_type,wall_id,snapshot,actor_profile_id)
  values(new.gym_id,new.id,change_type,new.wall_id,private.hold_inventory_snapshot(new),auth.uid());
  return new;
end;
$$;

create trigger wall_holds_capture_inventory
after insert or update on public.wall_holds
for each row execute function private.capture_hold_inventory_change();

-- Establish an initial history point for inventory that predates this migration.
insert into public.hold_inventory_events(gym_id,hold_id,event_type,wall_id,snapshot,actor_profile_id,created_at)
select hold.gym_id,hold.id,'inventory_created',hold.wall_id,private.hold_inventory_snapshot(hold),hold.created_by,hold.created_at
from public.wall_holds hold;

create or replace function private.capture_final_route_inventory_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  target_gym uuid := coalesce(new.gym_id,old.gym_id);
  target_hold uuid := coalesce(new.hold_id,old.hold_id);
  target_route uuid := coalesce(new.route_id,old.route_id);
  current_assignment boolean;
  last_event text;
  selected_hold public.wall_holds;
begin
  select exists(select 1 from public.route_holds item where item.gym_id=target_gym and item.hold_id=target_hold and item.route_id=target_route)
  into current_assignment;
  select event.event_type into last_event from public.hold_inventory_events event
  where event.gym_id=target_gym and event.hold_id=target_hold and event.route_id=target_route
    and event.event_type in ('route_assigned','route_unassigned')
  order by event.created_at desc,event.id desc limit 1;
  if (current_assignment and last_event is distinct from 'route_assigned')
    or (not current_assignment and last_event='route_assigned') then
    select * into selected_hold from public.wall_holds where id=target_hold and gym_id=target_gym;
    insert into public.hold_inventory_events(gym_id,hold_id,event_type,wall_id,route_id,snapshot,actor_profile_id)
    values(target_gym,target_hold,case when current_assignment then 'route_assigned' else 'route_unassigned' end,selected_hold.wall_id,target_route,private.hold_inventory_snapshot(selected_hold),auth.uid());
  end if;
  return null;
end;
$$;

-- Deferred evaluation sees the final route collection and suppresses no-op delete/reinsert pairs.
create constraint trigger route_holds_capture_inventory
after insert or delete on public.route_holds
deferrable initially deferred
for each row execute function private.capture_final_route_inventory_assignment();

insert into public.hold_inventory_events(gym_id,hold_id,event_type,wall_id,route_id,snapshot,actor_profile_id,created_at)
select assignment.gym_id,assignment.hold_id,'route_assigned',hold.wall_id,assignment.route_id,
  private.hold_inventory_snapshot(hold),assignment.assigned_by,assignment.assigned_at
from public.route_holds assignment
join public.wall_holds hold on hold.id=assignment.hold_id and hold.gym_id=assignment.gym_id;

comment on table public.hold_inventory_events is 'Append-only lifecycle, placement, condition, and route-assignment history for canonical physical holds.';
