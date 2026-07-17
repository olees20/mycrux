-- Prompt 3: gym content, routes, events, waivers, guests, and passes.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 10000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  audience text not null default 'members' check (audience in ('public', 'members', 'staff')),
  pinned_until timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_id_gym_key unique (id, gym_id),
  constraint announcements_publish_check check (status <> 'published' or published_at is not null)
);

create index announcements_gym_feed_idx
on public.announcements (gym_id, status, published_at desc)
where archived_at is null;

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create table public.walls (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 1000),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint walls_gym_name_key unique (gym_id, name),
  constraint walls_id_gym_key unique (id, gym_id)
);

create index walls_gym_active_idx on public.walls (gym_id, is_active, sort_order);

create trigger walls_set_updated_at
before update on public.walls
for each row execute function public.set_updated_at();

create table public.wall_images (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  wall_id uuid not null,
  storage_path text not null,
  alt_text text not null check (char_length(alt_text) between 1 and 500),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  captured_at timestamptz,
  version integer not null default 1 check (version > 0),
  is_current boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wall_images_wall_fkey
    foreign key (wall_id, gym_id) references public.walls(id, gym_id) on delete cascade,
  constraint wall_images_wall_version_key unique (wall_id, version),
  constraint wall_images_storage_path_key unique (storage_path),
  constraint wall_images_id_wall_gym_key unique (id, wall_id, gym_id),
  constraint wall_images_id_gym_key unique (id, gym_id)
);

create unique index wall_images_one_current_idx
on public.wall_images (wall_id)
where is_current and archived_at is null;

create index wall_images_gym_wall_idx on public.wall_images (gym_id, wall_id, version desc);

create trigger wall_images_set_updated_at
before update on public.wall_images
for each row execute function public.set_updated_at();

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  wall_id uuid not null,
  wall_image_id uuid,
  name text check (name is null or char_length(name) <= 120),
  colour text not null check (char_length(colour) between 1 and 40),
  grade_system text not null default 'font' check (char_length(grade_system) <= 30),
  grade text not null check (char_length(grade) between 1 and 20),
  route_type text not null default 'boulder' check (route_type in ('boulder', 'sport', 'top_rope', 'trad', 'training')),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired', 'archived')),
  setter_id uuid references public.profiles(id) on delete set null,
  set_on date,
  retire_on date,
  description text check (description is null or char_length(description) <= 2000),
  overlay jsonb check (overlay is null or jsonb_typeof(overlay) = 'object'),
  published_at timestamptz,
  retired_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_wall_fkey
    foreign key (wall_id, gym_id) references public.walls(id, gym_id) on delete restrict,
  constraint routes_wall_image_fkey
    foreign key (wall_image_id, wall_id, gym_id)
    references public.wall_images(id, wall_id, gym_id) on delete restrict,
  constraint routes_id_gym_key unique (id, gym_id),
  constraint routes_dates_check check (retire_on is null or set_on is null or retire_on >= set_on),
  constraint routes_publish_check check (status <> 'published' or published_at is not null)
);

create index routes_gym_status_created_idx on public.routes (gym_id, status, created_at desc);
create index routes_gym_wall_status_idx on public.routes (gym_id, wall_id, status);
create index routes_setter_idx on public.routes (gym_id, setter_id, set_on desc);

create trigger routes_set_updated_at
before update on public.routes
for each row execute function public.set_updated_at();

create table public.route_tags (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  tag text not null check (tag = lower(tag) and char_length(tag) between 1 and 40),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint route_tags_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete cascade,
  constraint route_tags_route_tag_key unique (route_id, tag),
  constraint route_tags_id_gym_key unique (id, gym_id)
);

create index route_tags_gym_tag_idx on public.route_tags (gym_id, tag);

create table public.route_media (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  thumbnail_path text,
  alt_text text check (alt_text is null or char_length(alt_text) <= 500),
  processing_status text not null default 'pending' check (processing_status in ('pending', 'ready', 'rejected', 'failed')),
  is_beta boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_media_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete cascade,
  constraint route_media_storage_path_key unique (storage_path),
  constraint route_media_id_gym_key unique (id, gym_id)
);

create index route_media_route_idx on public.route_media (gym_id, route_id, created_at desc);

create trigger route_media_set_updated_at
before update on public.route_media
for each row execute function public.set_updated_at();

create table public.route_feedback (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  grade_vote text check (grade_vote is null or char_length(grade_vote) <= 20),
  quality_rating smallint check (quality_rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  visibility text not null default 'staff' check (visibility in ('staff', 'public')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'flagged')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_feedback_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete cascade,
  constraint route_feedback_route_profile_key unique (route_id, profile_id),
  constraint route_feedback_id_gym_key unique (id, gym_id),
  constraint route_feedback_content_check check (
    grade_vote is not null or quality_rating is not null or comment is not null
  )
);

create index route_feedback_route_idx on public.route_feedback (gym_id, route_id, created_at desc);

create trigger route_feedback_set_updated_at
before update on public.route_feedback
for each row execute function public.set_updated_at();

create table public.ascent_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  climbed_at timestamptz not null default now(),
  ascent_type text not null check (ascent_type in ('flash', 'onsight', 'redpoint', 'repeat', 'attempt')),
  attempts smallint not null default 1 check (attempts between 1 and 999),
  perceived_grade text check (perceived_grade is null or char_length(perceived_grade) <= 20),
  notes text check (notes is null or char_length(notes) <= 2000),
  is_private boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ascent_logs_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete restrict,
  constraint ascent_logs_id_gym_key unique (id, gym_id)
);

create index ascent_logs_profile_time_idx on public.ascent_logs (profile_id, climbed_at desc);
create index ascent_logs_gym_route_time_idx on public.ascent_logs (gym_id, route_id, climbed_at desc);

create trigger ascent_logs_set_updated_at
before update on public.ascent_logs
for each row execute function public.set_updated_at();

create table public.favourites (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  route_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourites_route_fkey
    foreign key (route_id, gym_id) references public.routes(id, gym_id) on delete cascade,
  constraint favourites_route_profile_key unique (route_id, profile_id),
  constraint favourites_id_gym_key unique (id, gym_id)
);

create index favourites_profile_idx on public.favourites (profile_id, created_at desc);
create index favourites_gym_route_idx on public.favourites (gym_id, route_id);

create table public.guest_invites (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  email text check (email is null or (email = lower(email) and char_length(email) <= 320)),
  guest_name text not null check (char_length(guest_name) between 1 and 120),
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'registered', 'checked_in', 'expired', 'revoked')),
  expires_at timestamptz not null,
  registered_at timestamptz,
  checked_in_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_invites_token_hash_key unique (token_hash),
  constraint guest_invites_id_gym_key unique (id, gym_id)
);

create index guest_invites_gym_status_idx on public.guest_invites (gym_id, status, expires_at);

create trigger guest_invites_set_updated_at
before update on public.guest_invites
for each row execute function public.set_updated_at();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 10000),
  location text check (location is null or char_length(location) <= 240),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed', 'archived')),
  visibility text not null default 'members' check (visibility in ('public', 'members', 'staff')),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_id_gym_key unique (id, gym_id),
  constraint events_time_check check (ends_at > starts_at),
  constraint events_registration_window_check check (
    registration_closes_at is null or registration_opens_at is null or registration_closes_at >= registration_opens_at
  )
);

create index events_gym_status_start_idx on public.events (gym_id, status, starts_at);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  event_id uuid not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_invite_id uuid,
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_event_fkey
    foreign key (event_id, gym_id) references public.events(id, gym_id) on delete cascade,
  constraint event_registrations_guest_fkey
    foreign key (guest_invite_id, gym_id) references public.guest_invites(id, gym_id) on delete cascade,
  constraint event_registrations_subject_check check (num_nonnulls(profile_id, guest_invite_id) = 1),
  constraint event_registrations_id_gym_key unique (id, gym_id)
);

create unique index event_registrations_profile_key
on public.event_registrations (event_id, profile_id)
where profile_id is not null;

create unique index event_registrations_guest_key
on public.event_registrations (event_id, guest_invite_id)
where guest_invite_id is not null;

create index event_registrations_gym_event_status_idx
on public.event_registrations (gym_id, event_id, status);

create trigger event_registrations_set_updated_at
before update on public.event_registrations
for each row execute function public.set_updated_at();

create table public.waivers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 1000),
  is_required boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waivers_gym_name_key unique (gym_id, name),
  constraint waivers_id_gym_key unique (id, gym_id)
);

create trigger waivers_set_updated_at
before update on public.waivers
for each row execute function public.set_updated_at();

create table public.waiver_versions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  waiver_id uuid not null,
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 100000),
  content_hash text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'superseded')),
  effective_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint waiver_versions_waiver_fkey
    foreign key (waiver_id, gym_id) references public.waivers(id, gym_id) on delete restrict,
  constraint waiver_versions_waiver_version_key unique (waiver_id, version),
  constraint waiver_versions_content_hash_key unique (waiver_id, content_hash),
  constraint waiver_versions_id_gym_key unique (id, gym_id),
  constraint waiver_versions_publish_check check (
    status <> 'published' or (published_at is not null and effective_at is not null)
  )
);

create index waiver_versions_gym_status_idx on public.waiver_versions (gym_id, status, effective_at desc);

create table public.waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  waiver_version_id uuid not null,
  profile_id uuid references public.profiles(id) on delete restrict,
  guest_invite_id uuid,
  accepted_name text not null check (char_length(accepted_name) between 1 and 160),
  accepted_at timestamptz not null default now(),
  consent_snapshot jsonb not null check (jsonb_typeof(consent_snapshot) = 'object'),
  source_ip inet,
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  revoked_at timestamptz,
  revocation_reason text check (revocation_reason is null or char_length(revocation_reason) <= 1000),
  created_at timestamptz not null default now(),
  constraint waiver_acceptances_version_fkey
    foreign key (waiver_version_id, gym_id) references public.waiver_versions(id, gym_id) on delete restrict,
  constraint waiver_acceptances_guest_fkey
    foreign key (guest_invite_id, gym_id) references public.guest_invites(id, gym_id) on delete restrict,
  constraint waiver_acceptances_subject_check check (num_nonnulls(profile_id, guest_invite_id) = 1),
  constraint waiver_acceptances_id_gym_key unique (id, gym_id)
);

create unique index waiver_acceptances_profile_version_key
on public.waiver_acceptances (waiver_version_id, profile_id)
where profile_id is not null and revoked_at is null;

create unique index waiver_acceptances_guest_version_key
on public.waiver_acceptances (waiver_version_id, guest_invite_id)
where guest_invite_id is not null and revoked_at is null;

create index waiver_acceptances_gym_time_idx on public.waiver_acceptances (gym_id, accepted_at desc);

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete restrict,
  guest_invite_id uuid,
  pass_type text not null check (pass_type in ('membership', 'day_pass', 'guest', 'event', 'staff')),
  reference_code_hash text not null,
  status text not null default 'active' check (status in ('pending', 'active', 'used', 'expired', 'revoked')),
  valid_from timestamptz not null,
  valid_until timestamptz,
  used_at timestamptz,
  issued_by uuid references public.profiles(id) on delete set null,
  external_payment_reference text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  revoked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint passes_guest_fkey
    foreign key (guest_invite_id, gym_id) references public.guest_invites(id, gym_id) on delete restrict,
  constraint passes_subject_check check (num_nonnulls(profile_id, guest_invite_id) = 1),
  constraint passes_reference_code_hash_key unique (reference_code_hash),
  constraint passes_id_gym_key unique (id, gym_id),
  constraint passes_validity_check check (valid_until is null or valid_until > valid_from)
);

comment on column public.passes.external_payment_reference is
  'Reference to a future gym-controlled payment system; never a platform Stripe charge identifier.';

create index passes_gym_status_validity_idx on public.passes (gym_id, status, valid_from, valid_until);
create index passes_profile_idx on public.passes (profile_id, status) where profile_id is not null;
create index passes_guest_idx on public.passes (guest_invite_id, status) where guest_invite_id is not null;

create trigger passes_set_updated_at
before update on public.passes
for each row execute function public.set_updated_at();
