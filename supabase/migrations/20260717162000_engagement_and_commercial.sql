-- Prompt 3: competitions, community, chat, notifications, audit, and platform billing.

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  event_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 10000),
  format text not null default 'points' check (format in ('points', 'tops_zones', 'flash', 'custom')),
  scoring_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(scoring_rules) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'registration', 'live', 'complete', 'archived')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_event_fkey
    foreign key (event_id, gym_id) references public.events(id, gym_id) on delete restrict,
  constraint competitions_id_gym_key unique (id, gym_id),
  constraint competitions_time_check check (ends_at > starts_at)
);

create index competitions_gym_status_start_idx on public.competitions (gym_id, status, starts_at desc);

create trigger competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create table public.competition_routes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  competition_id uuid not null,
  route_id uuid not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  points numeric(10, 2) not null default 0 check (points >= 0),
  flash_bonus numeric(10, 2) not null default 0 check (flash_bonus >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_routes_competition_fkey
    foreign key (competition_id, gym_id) references public.competitions(id, gym_id) on delete cascade,
  constraint competition_routes_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete restrict,
  constraint competition_routes_competition_route_key unique (competition_id, route_id),
  constraint competition_routes_id_competition_gym_key unique (id, competition_id, gym_id),
  constraint competition_routes_id_gym_key unique (id, gym_id)
);

create index competition_routes_gym_competition_idx
on public.competition_routes (gym_id, competition_id, sort_order);

create trigger competition_routes_set_updated_at
before update on public.competition_routes
for each row execute function public.set_updated_at();

create table public.score_entries (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  competition_id uuid not null,
  competition_route_id uuid not null,
  profile_id uuid references public.profiles(id) on delete restrict,
  guest_invite_id uuid,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  score numeric(12, 2) not null default 0,
  attempts smallint not null default 1 check (attempts between 1 and 999),
  topped boolean not null default false,
  zone_reached boolean not null default false,
  recorded_at timestamptz not null default now(),
  notes text check (notes is null or char_length(notes) <= 1000),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_entries_competition_fkey
    foreign key (competition_id, gym_id) references public.competitions(id, gym_id) on delete cascade,
  constraint score_entries_route_fkey
    foreign key (competition_route_id, competition_id, gym_id)
    references public.competition_routes(id, competition_id, gym_id) on delete cascade,
  constraint score_entries_guest_fkey
    foreign key (guest_invite_id, gym_id) references public.guest_invites(id, gym_id) on delete restrict,
  constraint score_entries_subject_check check (num_nonnulls(profile_id, guest_invite_id) = 1),
  constraint score_entries_id_gym_key unique (id, gym_id)
);

create unique index score_entries_profile_route_key
on public.score_entries (competition_route_id, profile_id)
where profile_id is not null and voided_at is null;

create unique index score_entries_guest_route_key
on public.score_entries (competition_route_id, guest_invite_id)
where guest_invite_id is not null and voided_at is null;

create index score_entries_leaderboard_idx
on public.score_entries (gym_id, competition_id, score desc)
where voided_at is null;

create trigger score_entries_set_updated_at
before update on public.score_entries
for each row execute function public.set_updated_at();

create view public.competition_leaderboard as
select
  score_entries.gym_id,
  score_entries.competition_id,
  score_entries.profile_id,
  score_entries.guest_invite_id,
  sum(score_entries.score) as total_score,
  count(*) filter (where score_entries.topped) as tops,
  count(*) filter (where score_entries.zone_reached) as zones,
  sum(score_entries.attempts) as attempts,
  rank() over (
    partition by score_entries.gym_id, score_entries.competition_id
    order by sum(score_entries.score) desc,
      count(*) filter (where score_entries.topped) desc,
      sum(score_entries.attempts) asc
  ) as rank
from public.score_entries
where score_entries.voided_at is null
group by
  score_entries.gym_id,
  score_entries.competition_id,
  score_entries.profile_id,
  score_entries.guest_invite_id;

do $$
begin
  if current_setting('server_version_num')::integer >= 150000 then
    execute 'alter view public.competition_leaderboard set (security_invoker = true)';
  end if;
end;
$$;

comment on view public.competition_leaderboard is
  'Derived tenant-scoped leaderboard. PostgreSQL 15+ inherits score_entries RLS via security_invoker; Prompt 4 must revoke the PostgreSQL 14 fallback.';

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  post_type text not null default 'discussion' check (post_type in ('discussion', 'question', 'achievement', 'announcement_share')),
  title text check (title is null or char_length(title) <= 200),
  body text not null check (char_length(body) between 1 and 10000),
  visibility text not null default 'members' check (visibility in ('members', 'staff')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'flagged', 'removed')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_id_gym_key unique (id, gym_id)
);

create index community_posts_gym_feed_idx
on public.community_posts (gym_id, created_at desc)
where deleted_at is null;

create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  post_id uuid not null,
  parent_comment_id uuid,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'flagged', 'removed')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_post_fkey
    foreign key (post_id, gym_id) references public.community_posts(id, gym_id) on delete cascade,
  constraint comments_id_post_gym_key unique (id, post_id, gym_id),
  constraint comments_parent_fkey
    foreign key (parent_comment_id, post_id, gym_id)
    references public.comments(id, post_id, gym_id) on delete cascade,
  constraint comments_no_self_parent_check check (parent_comment_id is null or parent_comment_id <> id),
  constraint comments_id_gym_key unique (id, gym_id)
);

create index comments_post_time_idx on public.comments (gym_id, post_id, created_at);

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid,
  comment_id uuid,
  reaction text not null check (reaction in ('like', 'love', 'strong', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  constraint reactions_post_fkey
    foreign key (post_id, gym_id) references public.community_posts(id, gym_id) on delete cascade,
  constraint reactions_comment_fkey
    foreign key (comment_id, gym_id) references public.comments(id, gym_id) on delete cascade,
  constraint reactions_target_check check (num_nonnulls(post_id, comment_id) = 1),
  constraint reactions_id_gym_key unique (id, gym_id)
);

create unique index reactions_post_profile_key
on public.reactions (post_id, profile_id, reaction)
where post_id is not null;

create unique index reactions_comment_profile_key
on public.reactions (comment_id, profile_id, reaction)
where comment_id is not null;

create index reactions_gym_idx on public.reactions (gym_id, created_at desc);

create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  channel_type text not null default 'community' check (channel_type in ('community', 'staff', 'event', 'competition')),
  is_read_only boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_channels_gym_name_key unique (gym_id, name),
  constraint chat_channels_id_gym_key unique (id, gym_id)
);

create index chat_channels_gym_idx on public.chat_channels (gym_id, channel_type, archived_at);

create trigger chat_channels_set_updated_at
before update on public.chat_channels
for each row execute function public.set_updated_at();

create table public.channel_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  channel_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'member' check (membership_role in ('moderator', 'member')),
  muted_until timestamptz,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_members_channel_fkey
    foreign key (channel_id, gym_id) references public.chat_channels(id, gym_id) on delete cascade,
  constraint channel_members_channel_profile_key unique (channel_id, profile_id),
  constraint channel_members_id_gym_key unique (id, gym_id)
);

create index channel_members_profile_idx on public.channel_members (profile_id, left_at);
create index channel_members_gym_channel_idx on public.channel_members (gym_id, channel_id, left_at);

create trigger channel_members_set_updated_at
before update on public.channel_members
for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  channel_id uuid not null,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  reply_to_id uuid,
  body text not null check (char_length(body) between 1 and 5000),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'flagged', 'removed')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_channel_fkey
    foreign key (channel_id, gym_id) references public.chat_channels(id, gym_id) on delete cascade,
  constraint messages_id_channel_gym_key unique (id, channel_id, gym_id),
  constraint messages_reply_fkey
    foreign key (reply_to_id, channel_id, gym_id)
    references public.messages(id, channel_id, gym_id) on delete restrict,
  constraint messages_no_self_reply_check check (reply_to_id is null or reply_to_id <> id),
  constraint messages_id_gym_key unique (id, gym_id)
);

create index messages_channel_time_idx on public.messages (gym_id, channel_id, created_at desc);

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create table public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 3000),
  climbing_date timestamptz,
  disciplines text[] not null default '{}',
  grade_range text check (grade_range is null or char_length(grade_range) <= 80),
  status text not null default 'open' check (status in ('open', 'matched', 'closed', 'expired', 'removed')),
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_requests_id_gym_key unique (id, gym_id)
);

create index partner_requests_gym_open_idx
on public.partner_requests (gym_id, expires_at, created_at desc)
where status = 'open';

create index partner_requests_profile_idx on public.partner_requests (profile_id, created_at desc);

create trigger partner_requests_set_updated_at
before update on public.partner_requests
for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type ~ '^[a-z][a-z0-9_.-]*$'),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 1000),
  link_path text check (link_path is null or (left(link_path, 1) = '/' and left(link_path, 2) <> '//')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  read_at timestamptz,
  delivered_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_id_gym_key unique (id, gym_id)
);

create index notifications_profile_unread_idx
on public.notifications (profile_id, created_at desc)
where read_at is null and archived_at is null;

create index notifications_gym_profile_idx on public.notifications (gym_id, profile_id, created_at desc);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  chat_enabled boolean not null default true,
  community_enabled boolean not null default true,
  events_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_gym_profile_key unique (gym_id, profile_id),
  constraint notification_preferences_id_gym_key unique (id, gym_id),
  constraint notification_preferences_quiet_hours_check check (
    (quiet_hours_start is null) = (quiet_hours_end is null)
  )
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  actor_type text not null check (actor_type in ('user', 'platform_admin', 'service', 'webhook', 'system')),
  action text not null check (action ~ '^[a-z][a-z0-9_.-]*$'),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid,
  request_id uuid,
  outcome text not null default 'success' check (outcome in ('success', 'denied', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  source_ip inet,
  created_at timestamptz not null default now(),
  constraint audit_logs_id_gym_key unique (id, gym_id),
  constraint audit_logs_actor_check check (
    actor_type in ('service', 'webhook', 'system') or actor_profile_id is not null
  )
);

comment on table public.audit_logs is
  'Append-only audit records. Application roles must never receive update or delete grants.';

create index audit_logs_gym_time_idx on public.audit_logs (gym_id, created_at desc);
create index audit_logs_actor_time_idx on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id, created_at desc);
create index audit_logs_request_idx on public.audit_logs (request_id) where request_id is not null;

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete restrict,
  stripe_customer_id text not null check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  billing_email text check (billing_email is null or (billing_email = lower(billing_email) and char_length(billing_email) <= 320)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_gym_key unique (gym_id),
  constraint billing_customers_stripe_key unique (stripe_customer_id),
  constraint billing_customers_id_gym_key unique (id, gym_id)
);

comment on table public.billing_customers is
  'Stripe customers for gyms buying Crux platform access; never gym members or day-pass guests.';

create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete restrict,
  billing_customer_id uuid not null,
  stripe_subscription_id text not null check (stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  plan_key text not null check (plan_key ~ '^[a-z][a-z0-9_-]*$'),
  status text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_ends_at timestamptz,
  last_stripe_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_billing_customer_fkey
    foreign key (billing_customer_id, gym_id) references public.billing_customers(id, gym_id) on delete restrict,
  constraint subscriptions_stripe_key unique (stripe_subscription_id),
  constraint subscriptions_id_gym_key unique (id, gym_id),
  constraint subscriptions_period_check check (
    current_period_end is null or current_period_start is null or current_period_end >= current_period_start
  )
);

comment on table public.subscriptions is
  'B2B SaaS subscriptions paid by gyms to the platform. Not gym-member commerce.';

create index subscriptions_gym_status_idx on public.subscriptions (gym_id, status, current_period_end);

create unique index subscriptions_one_current_per_gym_idx
on public.subscriptions (gym_id)
where status in ('trialing', 'active', 'past_due', 'paused', 'unpaid', 'incomplete');

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.feature_entitlements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9_.-]*$'),
  enabled boolean not null default true,
  limit_value integer check (limit_value is null or limit_value >= 0),
  source text not null default 'plan' check (source in ('plan', 'override', 'trial', 'promotion')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_entitlements_subscription_fkey
    foreign key (subscription_id, gym_id) references public.subscriptions(id, gym_id) on delete cascade,
  constraint feature_entitlements_gym_feature_key unique (gym_id, feature_key),
  constraint feature_entitlements_id_gym_key unique (id, gym_id),
  constraint feature_entitlements_period_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index feature_entitlements_gym_enabled_idx
on public.feature_entitlements (gym_id, enabled, feature_key);

create trigger feature_entitlements_set_updated_at
before update on public.feature_entitlements
for each row execute function public.set_updated_at();
