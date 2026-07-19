-- Service-role-only application data reset. Schema and reference configuration remain.

create or replace function public.administrative_reset_application_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reset_tables constant text[] := array[
    'account_deletion_requests',
    'announcements',
    'ascent_logs',
    'ascent_media',
    'audit_logs',
    'billing_customers',
    'channel_members',
    'chat_channels',
    'check_in_tokens',
    'check_ins',
    'climbing_sessions',
    'comments',
    'community_blocks',
    'community_guideline_acceptances',
    'community_mutes',
    'community_posts',
    'community_reports',
    'competition_divisions',
    'competition_registrations',
    'competition_routes',
    'competitions',
    'consent_records',
    'event_registrations',
    'events',
    'favourites',
    'feature_entitlements',
    'guest_invites',
    'gym_branding',
    'gym_domains',
    'gym_memberships',
    'gym_slug_history',
    'gyms',
    'integration_connections',
    'integration_deliveries',
    'invitations',
    'leaderboard_preferences',
    'media_abuse_reports',
    'media_assets',
    'member_achievements',
    'message_reports',
    'messages',
    'notification_preferences',
    'notifications',
    'partner_interests',
    'partner_request_reports',
    'partner_requests',
    'passes',
    'platform_support_notes',
    'profile_privacy_settings',
    'reactions',
    'route_feedback',
    'route_media',
    'route_tags',
    'routes',
    'score_entries',
    'score_entry_history',
    'staff_roles',
    'stripe_billing_events',
    'subscriptions',
    'waiver_acceptances',
    'waiver_versions',
    'waivers',
    'wall_images',
    'walls'
  ];
  table_name text;
  table_count bigint;
  table_counts jsonb := '{}'::jsonb;
  truncate_targets text;
  profiles_preserved bigint;
  plans_preserved bigint;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Supabase service-role access is required'
      using errcode = '42501';
  end if;

  foreach table_name in array reset_tables loop
    execute format('select count(*) from public.%I', table_name) into table_count;
    table_counts := table_counts || jsonb_build_object('public.' || table_name, table_count);
  end loop;
  select count(*) into table_count from private.action_rate_limits;
  table_counts := table_counts || jsonb_build_object('private.action_rate_limits', table_count);
  select count(*) into profiles_preserved from public.profiles;
  select count(*) into plans_preserved from public.platform_plans;

  select string_agg(format('public.%I', item), ', ')
  into truncate_targets
  from unnest(reset_tables) item;

  execute 'truncate table ' || truncate_targets ||
    ', private.action_rate_limits restart identity cascade';

  return jsonb_build_object(
    'tables', table_counts,
    'profiles_preserved', profiles_preserved,
    'platform_plans_preserved', plans_preserved
  );
end;
$$;

revoke all on function public.administrative_reset_application_data() from public,anon,authenticated;
grant execute on function public.administrative_reset_application_data() to service_role;

comment on function public.administrative_reset_application_data() is
  'Destructively truncates the explicit MyCrux application-data inventory. Service role only; profiles, platform plans, schema, buckets, policies and migration history are preserved.';
