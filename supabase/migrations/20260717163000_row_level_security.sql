-- Prompt 4: database-enforced authorization and tenant isolation.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

create or replace function private.current_membership_id(target_gym_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.id
  from public.gym_memberships membership
  where membership.gym_id = target_gym_id
    and membership.profile_id = auth.uid()
    and membership.status = 'active'
  limit 1;
$$;

create or replace function private.has_gym_role(target_gym_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gym_memberships membership
    where membership.gym_id = target_gym_id
      and membership.profile_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function private.has_gym_capability(target_gym_id uuid, requested_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gym_memberships membership
    left join public.staff_roles staff_role
      on staff_role.id = membership.staff_role_id
     and staff_role.gym_id = membership.gym_id
     and staff_role.archived_at is null
    where membership.gym_id = target_gym_id
      and membership.profile_id = auth.uid()
      and membership.status = 'active'
      and (
        membership.role = 'owner'
        or requested_capability = any(coalesce(staff_role.capabilities, '{}'::text[]))
        or (
          membership.role = 'route_setter'
          and requested_capability = any(array[
            'walls.read', 'routes.manage', 'route_feedback.read',
            'competitions.score'
          ])
        )
      )
  );
$$;

create or replace function private.shares_active_gym(other_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = other_profile_id or exists (
    select 1
    from public.gym_memberships mine
    join public.gym_memberships theirs on theirs.gym_id = mine.gym_id
    where mine.profile_id = auth.uid()
      and mine.status = 'active'
      and theirs.profile_id = other_profile_id
      and theirs.status = 'active'
  );
$$;

create or replace function private.can_read_route(target_route_id uuid, target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_membership_id(target_gym_id) is not null
    and exists (
      select 1
      from public.routes route
      where route.id = target_route_id
        and route.gym_id = target_gym_id
        and route.status = 'published'
        and route.archived_at is null
    );
$$;

create or replace function private.can_access_channel(target_channel_id uuid, target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_membership_id(target_gym_id) is not null
    and exists (
      select 1
      from public.chat_channels channel
      where channel.id = target_channel_id
        and channel.gym_id = target_gym_id
        and channel.archived_at is null
        and (
          channel.channel_type = 'community'
          or private.has_gym_capability(target_gym_id, 'chat.manage')
          or exists (
            select 1
            from public.channel_members channel_member
            where channel_member.channel_id = channel.id
              and channel_member.gym_id = channel.gym_id
              and channel_member.profile_id = auth.uid()
              and channel_member.left_at is null
          )
        )
    );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.current_membership_id(uuid) to authenticated;
grant execute on function private.has_gym_role(uuid, text[]) to authenticated;
grant execute on function private.has_gym_capability(uuid, text) to authenticated;
grant execute on function private.shares_active_gym(uuid) to authenticated;
grant execute on function private.can_read_route(uuid, uuid) to authenticated;
grant execute on function private.can_access_channel(uuid, uuid) to authenticated;

create or replace function private.prevent_protected_column_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  protected_column text;
begin
  foreach protected_column in array tg_argv loop
    if to_jsonb(old) -> protected_column is distinct from to_jsonb(new) -> protected_column then
      raise exception 'Changing protected column % is not allowed', protected_column
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.prevent_protected_column_changes() from public, anon, authenticated;

-- Apply immutable tenant/ownership guards. Insert ownership is enforced by WITH CHECK policies.
do $$
declare
  guard record;
  trigger_arguments text;
begin
  for guard in
    select * from (values
      ('profiles', array['id', 'is_platform_admin', 'suspended_at']),
      ('gyms', array['id']),
      ('gym_domains', array['gym_id']),
      ('gym_branding', array['gym_id']),
      ('staff_roles', array['gym_id', 'is_system']),
      ('gym_memberships', array['gym_id', 'profile_id']),
      ('invitations', array['gym_id', 'invited_by']),
      ('announcements', array['gym_id', 'author_id']),
      ('walls', array['gym_id']),
      ('wall_images', array['gym_id', 'wall_id']),
      ('routes', array['gym_id', 'wall_id', 'setter_id']),
      ('route_tags', array['gym_id', 'route_id', 'created_by']),
      ('route_media', array['gym_id', 'route_id', 'uploaded_by']),
      ('route_feedback', array['gym_id', 'route_id', 'profile_id']),
      ('ascent_logs', array['gym_id', 'route_id', 'profile_id']),
      ('favourites', array['gym_id', 'route_id', 'profile_id']),
      ('events', array['gym_id', 'created_by']),
      ('event_registrations', array['gym_id', 'event_id', 'profile_id', 'guest_invite_id']),
      ('competitions', array['gym_id', 'created_by']),
      ('competition_routes', array['gym_id', 'competition_id', 'route_id']),
      ('score_entries', array['gym_id', 'competition_id', 'competition_route_id', 'profile_id', 'guest_invite_id']),
      ('community_posts', array['gym_id', 'author_id']),
      ('comments', array['gym_id', 'post_id', 'author_id']),
      ('reactions', array['gym_id', 'profile_id', 'post_id', 'comment_id']),
      ('chat_channels', array['gym_id', 'created_by']),
      ('channel_members', array['gym_id', 'channel_id', 'profile_id']),
      ('messages', array['gym_id', 'channel_id', 'sender_id']),
      ('partner_requests', array['gym_id', 'profile_id']),
      ('waivers', array['gym_id']),
      ('waiver_versions', array['gym_id', 'waiver_id', 'created_by']),
      ('waiver_acceptances', array[
        'gym_id', 'waiver_version_id', 'profile_id', 'guest_invite_id',
        'accepted_name', 'accepted_at', 'consent_snapshot', 'source_ip', 'user_agent'
      ]),
      ('guest_invites', array['gym_id']),
      ('passes', array['gym_id', 'profile_id', 'guest_invite_id']),
      ('notifications', array[
        'gym_id', 'profile_id', 'notification_type', 'title', 'body',
        'link_path', 'payload', 'delivered_at'
      ]),
      ('notification_preferences', array['gym_id', 'profile_id']),
      ('audit_logs', array['gym_id', 'actor_profile_id', 'actor_type']),
      ('billing_customers', array['gym_id']),
      ('subscriptions', array['gym_id', 'billing_customer_id']),
      ('feature_entitlements', array['gym_id', 'subscription_id'])
    ) as guards(table_name, protected_columns)
  loop
    select string_agg(quote_literal(column_name), ', ')
    into trigger_arguments
    from unnest(guard.protected_columns) as column_name;

    execute format(
      'create trigger protect_%1$I_columns before update on public.%1$I for each row execute function private.prevent_protected_column_changes(%2$s)',
      guard.table_name,
      trigger_arguments
    );
  end loop;
end;
$$;

create or replace function private.require_capability_for_column_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  column_index integer;
begin
  for column_index in 1..(tg_nargs - 1) loop
    if to_jsonb(old) -> tg_argv[column_index] is distinct from to_jsonb(new) -> tg_argv[column_index]
      and not private.has_gym_capability(new.gym_id, tg_argv[0]) then
      raise exception 'Changing protected staff column % requires capability %',
        tg_argv[column_index], tg_argv[0]
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.require_capability_for_column_changes()
from public, anon, authenticated;

create trigger protect_route_feedback_moderation
before update on public.route_feedback
for each row execute function private.require_capability_for_column_changes(
  'routes.manage', 'moderation_status'
);

create trigger protect_community_post_moderation
before update on public.community_posts
for each row execute function private.require_capability_for_column_changes(
  'community.moderate', 'moderation_status'
);

create trigger protect_comment_moderation
before update on public.comments
for each row execute function private.require_capability_for_column_changes(
  'community.moderate', 'moderation_status'
);

create trigger protect_message_moderation
before update on public.messages
for each row execute function private.require_capability_for_column_changes(
  'chat.manage', 'moderation_status'
);

create trigger protect_channel_member_role
before update on public.channel_members
for each row execute function private.require_capability_for_column_changes(
  'chat.manage', 'membership_role'
);

-- RLS applies to every exposed base table. Views inherit underlying access on PostgreSQL 15+.
do $$
declare
  table_name text;
begin
  for table_name in
    select tables.table_name
    from information_schema.tables
    where tables.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema public, private to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema private to service_role;
revoke all on public.competition_leaderboard from anon, authenticated;
do $$
begin
  if current_setting('server_version_num')::integer >= 150000 then
    grant select on public.competition_leaderboard to authenticated;
  end if;
end;
$$;

-- Identity and tenant administration.
create policy profiles_select_shared_gym on public.profiles
for select to authenticated
using (private.shares_active_gym(id));

create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = auth.uid() and not is_platform_admin);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and not is_platform_admin);

create policy gyms_select_member on public.gyms
for select to authenticated
using (private.current_membership_id(id) is not null);

create policy gyms_update_owner on public.gyms
for update to authenticated
using (private.has_gym_role(id, array['owner']))
with check (private.has_gym_role(id, array['owner']));

create policy gym_domains_select_member on public.gym_domains
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

create policy gym_domains_manage_owner on public.gym_domains
for all to authenticated
using (private.has_gym_role(gym_id, array['owner']))
with check (private.has_gym_role(gym_id, array['owner']));

create policy gym_branding_select_member on public.gym_branding
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

create policy gym_branding_manage_owner on public.gym_branding
for all to authenticated
using (private.has_gym_role(gym_id, array['owner']))
with check (private.has_gym_role(gym_id, array['owner']));

create policy staff_roles_select_member on public.staff_roles
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

create policy staff_roles_manage_owner on public.staff_roles
for all to authenticated
using (private.has_gym_role(gym_id, array['owner']))
with check (private.has_gym_role(gym_id, array['owner']) and not is_system);

create policy gym_memberships_select_gym on public.gym_memberships
for select to authenticated
using (
  profile_id = auth.uid()
  or private.current_membership_id(gym_id) is not null
);

create policy gym_memberships_insert_owner on public.gym_memberships
for insert to authenticated
with check (private.has_gym_role(gym_id, array['owner']));

create policy gym_memberships_update_owner on public.gym_memberships
for update to authenticated
using (private.has_gym_role(gym_id, array['owner']))
with check (private.has_gym_role(gym_id, array['owner']));

create policy gym_memberships_delete_owner on public.gym_memberships
for delete to authenticated
using (private.has_gym_role(gym_id, array['owner']));

create policy invitations_select_owner on public.invitations
for select to authenticated
using (private.has_gym_role(gym_id, array['owner']));

create policy invitations_insert_owner on public.invitations
for insert to authenticated
with check (private.has_gym_role(gym_id, array['owner']) and invited_by = auth.uid());

create policy invitations_update_owner on public.invitations
for update to authenticated
using (private.has_gym_role(gym_id, array['owner']))
with check (private.has_gym_role(gym_id, array['owner']));

create policy invitations_delete_owner on public.invitations
for delete to authenticated
using (private.has_gym_role(gym_id, array['owner']));

-- Published gym content and route operations.
create policy announcements_select_published on public.announcements
for select to authenticated
using (
  (private.current_membership_id(gym_id) is not null and status = 'published' and archived_at is null)
  or private.has_gym_capability(gym_id, 'announcements.manage')
);

create policy announcements_insert_staff on public.announcements
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'announcements.manage') and author_id = auth.uid());

create policy announcements_update_staff on public.announcements
for update to authenticated
using (private.has_gym_capability(gym_id, 'announcements.manage'))
with check (private.has_gym_capability(gym_id, 'announcements.manage'));

create policy announcements_delete_staff on public.announcements
for delete to authenticated
using (private.has_gym_capability(gym_id, 'announcements.manage'));

create policy walls_select_member on public.walls
for select to authenticated
using (
  (private.current_membership_id(gym_id) is not null and is_active and archived_at is null)
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy walls_manage_staff on public.walls
for all to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

create policy wall_images_select_member on public.wall_images
for select to authenticated
using (
  (private.current_membership_id(gym_id) is not null and is_current and archived_at is null)
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy wall_images_manage_staff on public.wall_images
for all to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

create policy routes_select_published on public.routes
for select to authenticated
using (
  private.can_read_route(id, gym_id)
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy routes_manage_staff on public.routes
for all to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

create policy route_tags_select_published on public.route_tags
for select to authenticated
using (
  private.can_read_route(route_id, gym_id)
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy route_tags_manage_staff on public.route_tags
for all to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

create policy route_media_select_published on public.route_media
for select to authenticated
using (
  (
    private.can_read_route(route_id, gym_id)
    and processing_status = 'ready'
    and archived_at is null
  )
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy route_media_manage_staff on public.route_media
for all to authenticated
using (private.has_gym_capability(gym_id, 'routes.manage'))
with check (private.has_gym_capability(gym_id, 'routes.manage'));

create policy route_feedback_select_allowed on public.route_feedback
for select to authenticated
using (
  profile_id = auth.uid()
  or (
    visibility = 'public'
    and moderation_status = 'visible'
    and private.can_read_route(route_id, gym_id)
  )
  or private.has_gym_capability(gym_id, 'route_feedback.read')
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy route_feedback_insert_self on public.route_feedback
for insert to authenticated
with check (
  profile_id = auth.uid()
  and private.current_membership_id(gym_id) is not null
  and private.can_read_route(route_id, gym_id)
);

create policy route_feedback_update_self_or_staff on public.route_feedback
for update to authenticated
using (
  profile_id = auth.uid()
  or private.has_gym_capability(gym_id, 'route_feedback.read')
  or private.has_gym_capability(gym_id, 'routes.manage')
)
with check (
  profile_id = auth.uid()
  or private.has_gym_capability(gym_id, 'route_feedback.read')
  or private.has_gym_capability(gym_id, 'routes.manage')
);

create policy route_feedback_delete_self on public.route_feedback
for delete to authenticated
using (profile_id = auth.uid());

-- Personal climbing records.
create policy ascent_logs_select_self on public.ascent_logs
for select to authenticated
using (profile_id = auth.uid());

create policy ascent_logs_insert_self on public.ascent_logs
for insert to authenticated
with check (
  profile_id = auth.uid()
  and private.current_membership_id(gym_id) is not null
  and private.can_read_route(route_id, gym_id)
);

create policy ascent_logs_update_self on public.ascent_logs
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy ascent_logs_delete_self on public.ascent_logs
for delete to authenticated
using (profile_id = auth.uid());

create policy favourites_select_self on public.favourites
for select to authenticated
using (profile_id = auth.uid());

create policy favourites_insert_self on public.favourites
for insert to authenticated
with check (
  profile_id = auth.uid()
  and private.current_membership_id(gym_id) is not null
  and private.can_read_route(route_id, gym_id)
);

create policy favourites_delete_self on public.favourites
for delete to authenticated
using (profile_id = auth.uid());

-- Events, waivers, guest flows, and passes.
create policy events_select_published on public.events
for select to authenticated
using (
  (
    private.current_membership_id(gym_id) is not null
    and status in ('published', 'completed')
    and archived_at is null
  )
  or private.has_gym_capability(gym_id, 'events.manage')
);

create policy events_insert_staff on public.events
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'events.manage') and created_by = auth.uid());

create policy events_update_staff on public.events
for update to authenticated
using (private.has_gym_capability(gym_id, 'events.manage'))
with check (private.has_gym_capability(gym_id, 'events.manage'));

create policy events_delete_staff on public.events
for delete to authenticated
using (private.has_gym_capability(gym_id, 'events.manage'));

create policy event_registrations_select_allowed on public.event_registrations
for select to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'events.manage'));

create policy event_registrations_insert_self on public.event_registrations
for insert to authenticated
with check (
  profile_id = auth.uid()
  and guest_invite_id is null
  and private.current_membership_id(gym_id) is not null
  and exists (
    select 1 from public.events event
    where event.id = event_registrations.event_id
      and event.gym_id = event_registrations.gym_id
      and event.status = 'published'
  )
);

create policy event_registrations_update_allowed on public.event_registrations
for update to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'events.manage'))
with check (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'events.manage'));

create policy event_registrations_delete_self on public.event_registrations
for delete to authenticated
using (profile_id = auth.uid());

create policy waivers_select_member on public.waivers
for select to authenticated
using (
  (private.current_membership_id(gym_id) is not null and archived_at is null)
  or private.has_gym_capability(gym_id, 'waivers.manage')
);

create policy waivers_manage_staff on public.waivers
for all to authenticated
using (private.has_gym_capability(gym_id, 'waivers.manage'))
with check (private.has_gym_capability(gym_id, 'waivers.manage'));

create policy waiver_versions_select_published on public.waiver_versions
for select to authenticated
using (
  (private.current_membership_id(gym_id) is not null and status in ('published', 'superseded'))
  or private.has_gym_capability(gym_id, 'waivers.manage')
);

create policy waiver_versions_insert_staff on public.waiver_versions
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'waivers.manage') and created_by = auth.uid());

create policy waiver_versions_update_staff on public.waiver_versions
for update to authenticated
using (private.has_gym_capability(gym_id, 'waivers.manage'))
with check (private.has_gym_capability(gym_id, 'waivers.manage'));

create policy waiver_acceptances_select_allowed on public.waiver_acceptances
for select to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'waivers.manage'));

create policy waiver_acceptances_insert_self on public.waiver_acceptances
for insert to authenticated
with check (
  profile_id = auth.uid()
  and guest_invite_id is null
  and private.current_membership_id(gym_id) is not null
  and exists (
    select 1 from public.waiver_versions waiver_version
    where waiver_version.id = waiver_acceptances.waiver_version_id
      and waiver_version.gym_id = waiver_acceptances.gym_id
      and waiver_version.status = 'published'
  )
);

create policy waiver_acceptances_update_staff on public.waiver_acceptances
for update to authenticated
using (private.has_gym_capability(gym_id, 'waivers.manage'))
with check (private.has_gym_capability(gym_id, 'waivers.manage'));

create policy guest_invites_select_staff on public.guest_invites
for select to authenticated
using (
  private.has_gym_capability(gym_id, 'guests.manage')
  or private.has_gym_capability(gym_id, 'guests.check_in')
);

create policy guest_invites_insert_staff on public.guest_invites
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'guests.manage'));

create policy guest_invites_update_staff on public.guest_invites
for update to authenticated
using (
  private.has_gym_capability(gym_id, 'guests.manage')
  or private.has_gym_capability(gym_id, 'guests.check_in')
)
with check (
  private.has_gym_capability(gym_id, 'guests.manage')
  or private.has_gym_capability(gym_id, 'guests.check_in')
);

create policy guest_invites_delete_staff on public.guest_invites
for delete to authenticated
using (private.has_gym_capability(gym_id, 'guests.manage'));

create policy passes_select_self on public.passes
for select to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'passes.manage'));

create policy passes_manage_staff on public.passes
for all to authenticated
using (private.has_gym_capability(gym_id, 'passes.manage'))
with check (private.has_gym_capability(gym_id, 'passes.manage'));

-- Competitions and scores.
create policy competitions_select_published on public.competitions
for select to authenticated
using (
  (
    private.current_membership_id(gym_id) is not null
    and status in ('registration', 'live', 'complete')
    and archived_at is null
  )
  or private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
);

create policy competitions_insert_staff on public.competitions
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'competitions.manage') and created_by = auth.uid());

create policy competitions_update_staff on public.competitions
for update to authenticated
using (private.has_gym_capability(gym_id, 'competitions.manage'))
with check (private.has_gym_capability(gym_id, 'competitions.manage'));

create policy competitions_delete_staff on public.competitions
for delete to authenticated
using (private.has_gym_capability(gym_id, 'competitions.manage'));

create policy competition_routes_select_member on public.competition_routes
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  or private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
);

create policy competition_routes_manage_staff on public.competition_routes
for all to authenticated
using (private.has_gym_capability(gym_id, 'competitions.manage'))
with check (private.has_gym_capability(gym_id, 'competitions.manage'));

create policy score_entries_select_member on public.score_entries
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  or private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
);

create policy score_entries_insert_staff on public.score_entries
for insert to authenticated
with check (
  private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
);

create policy score_entries_update_staff on public.score_entries
for update to authenticated
using (
  private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
)
with check (
  private.has_gym_capability(gym_id, 'competitions.manage')
  or private.has_gym_capability(gym_id, 'competitions.score')
);

-- Community content. Deletes are soft deletes performed through UPDATE policies.
create policy community_posts_select_member on public.community_posts
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  and (
    (moderation_status = 'visible' and deleted_at is null)
    or author_id = auth.uid()
    or private.has_gym_capability(gym_id, 'community.moderate')
  )
);

create policy community_posts_insert_self on public.community_posts
for insert to authenticated
with check (author_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy community_posts_update_self_or_moderator on public.community_posts
for update to authenticated
using (author_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'))
with check (author_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'));

create policy comments_select_member on public.comments
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  and (
    (moderation_status = 'visible' and deleted_at is null)
    or author_id = auth.uid()
    or private.has_gym_capability(gym_id, 'community.moderate')
  )
);

create policy comments_insert_self on public.comments
for insert to authenticated
with check (author_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy comments_update_self_or_moderator on public.comments
for update to authenticated
using (author_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'))
with check (author_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'));

create policy reactions_select_member on public.reactions
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

create policy reactions_insert_self on public.reactions
for insert to authenticated
with check (profile_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy reactions_delete_self on public.reactions
for delete to authenticated
using (profile_id = auth.uid());

create policy partner_requests_select_member on public.partner_requests
for select to authenticated
using (
  private.current_membership_id(gym_id) is not null
  and (status = 'open' or profile_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'))
);

create policy partner_requests_insert_self on public.partner_requests
for insert to authenticated
with check (profile_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy partner_requests_update_self_or_moderator on public.partner_requests
for update to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'))
with check (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'community.moderate'));

-- Realtime-backed gym channels.
create policy chat_channels_select_allowed on public.chat_channels
for select to authenticated
using (private.can_access_channel(id, gym_id));

create policy chat_channels_insert_staff on public.chat_channels
for insert to authenticated
with check (private.has_gym_capability(gym_id, 'chat.manage') and created_by = auth.uid());

create policy chat_channels_update_staff on public.chat_channels
for update to authenticated
using (private.has_gym_capability(gym_id, 'chat.manage'))
with check (private.has_gym_capability(gym_id, 'chat.manage'));

create policy chat_channels_delete_staff on public.chat_channels
for delete to authenticated
using (private.has_gym_capability(gym_id, 'chat.manage'));

create policy channel_members_select_allowed on public.channel_members
for select to authenticated
using (profile_id = auth.uid() or private.can_access_channel(channel_id, gym_id));

create policy channel_members_insert_self_or_staff on public.channel_members
for insert to authenticated
with check (
  (
    profile_id = auth.uid()
    and membership_role = 'member'
    and private.can_access_channel(channel_id, gym_id)
  )
  or private.has_gym_capability(gym_id, 'chat.manage')
);

create policy channel_members_update_self_or_staff on public.channel_members
for update to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'))
with check (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'));

create policy channel_members_delete_self_or_staff on public.channel_members
for delete to authenticated
using (profile_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'));

create policy messages_select_channel on public.messages
for select to authenticated
using (private.can_access_channel(channel_id, gym_id));

create policy messages_insert_self on public.messages
for insert to authenticated
with check (sender_id = auth.uid() and private.can_access_channel(channel_id, gym_id));

create policy messages_update_self_or_staff on public.messages
for update to authenticated
using (sender_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'))
with check (sender_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'));

-- Private notifications and preferences.
create policy notifications_select_self on public.notifications
for select to authenticated
using (profile_id = auth.uid());

create policy notifications_update_self on public.notifications
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy notification_preferences_select_self on public.notification_preferences
for select to authenticated
using (profile_id = auth.uid());

create policy notification_preferences_insert_self on public.notification_preferences
for insert to authenticated
with check (profile_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy notification_preferences_update_self on public.notification_preferences
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid() and private.current_membership_id(gym_id) is not null);

create policy notification_preferences_delete_self on public.notification_preferences
for delete to authenticated
using (profile_id = auth.uid());

-- Governance and B2B billing are read-only to authorized gym owners.
create policy audit_logs_select_owner on public.audit_logs
for select to authenticated
using (gym_id is not null and private.has_gym_role(gym_id, array['owner']));

create policy billing_customers_select_owner on public.billing_customers
for select to authenticated
using (private.has_gym_role(gym_id, array['owner']));

create policy subscriptions_select_owner on public.subscriptions
for select to authenticated
using (private.has_gym_role(gym_id, array['owner']));

create policy feature_entitlements_select_member on public.feature_entitlements
for select to authenticated
using (private.current_membership_id(gym_id) is not null);

-- No anon policies are defined. Guest invitation, waiver, and pass tokens are verified
-- by narrow server-only service-role modules; hashes are never queryable by anonymous clients.
