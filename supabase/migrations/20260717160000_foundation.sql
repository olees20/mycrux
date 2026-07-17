-- Prompt 3: identity, tenant, membership, and invitation foundations.
-- RLS policies are intentionally added by Prompt 4; do not expose these tables before then.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  pronouns text check (pronouns is null or char_length(pronouns) <= 80),
  bio text check (bio is null or char_length(bio) <= 500),
  locale text not null default 'en-GB',
  is_platform_admin boolean not null default false,
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  legal_name text check (legal_name is null or char_length(legal_name) <= 160),
  timezone text not null default 'Europe/London',
  country_code text not null default 'GB' check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'active' check (status in ('trial', 'active', 'past_due', 'suspended', 'closed')),
  public_join_requests_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gyms_slug_key unique (slug)
);

create trigger gyms_set_updated_at
before update on public.gyms
for each row execute function public.set_updated_at();

create table public.gym_domains (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  domain text not null check (domain = lower(domain) and domain ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'),
  is_primary boolean not null default false,
  verification_token_hash text,
  verified_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_domains_domain_key unique (domain),
  constraint gym_domains_id_gym_key unique (id, gym_id)
);

create unique index gym_domains_one_primary_per_gym_idx
on public.gym_domains (gym_id)
where is_primary and archived_at is null;

create index gym_domains_gym_idx on public.gym_domains (gym_id, archived_at);

create trigger gym_domains_set_updated_at
before update on public.gym_domains
for each row execute function public.set_updated_at();

create table public.gym_branding (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  logo_path text,
  mark_path text,
  primary_colour text not null default '#17211B' check (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  accent_colour text not null default '#D9FF45' check (accent_colour ~ '^#[0-9A-Fa-f]{6}$'),
  background_colour text not null default '#F7F7F2' check (background_colour ~ '^#[0-9A-Fa-f]{6}$'),
  welcome_message text check (welcome_message is null or char_length(welcome_message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gym_branding_set_updated_at
before update on public.gym_branding
for each row execute function public.set_updated_at();

create table public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  key text not null check (key = lower(key) and key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  capabilities text[] not null default '{}',
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_gym_key unique (gym_id, key),
  constraint staff_roles_id_gym_key unique (id, gym_id)
);

create index staff_roles_gym_idx on public.staff_roles (gym_id, archived_at);

create trigger staff_roles_set_updated_at
before update on public.staff_roles
for each row execute function public.set_updated_at();

create table public.gym_memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'staff', 'route_setter', 'member')),
  staff_role_id uuid,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended', 'left')),
  joined_at timestamptz,
  suspended_at timestamptz,
  left_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_memberships_gym_profile_key unique (gym_id, profile_id),
  constraint gym_memberships_id_gym_key unique (id, gym_id),
  constraint gym_memberships_staff_role_fkey
    foreign key (staff_role_id, gym_id) references public.staff_roles(id, gym_id) on delete restrict,
  constraint gym_memberships_state_dates_check check (
    (status <> 'active' or joined_at is not null)
    and (status <> 'suspended' or suspended_at is not null)
    and (status <> 'left' or left_at is not null)
  ),
  constraint gym_memberships_staff_role_check check (
    staff_role_id is null or role in ('staff', 'route_setter')
  )
);

create index gym_memberships_profile_status_idx on public.gym_memberships (profile_id, status);
create index gym_memberships_gym_role_status_idx on public.gym_memberships (gym_id, role, status);

create trigger gym_memberships_set_updated_at
before update on public.gym_memberships
for each row execute function public.set_updated_at();

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 320),
  token_hash text not null,
  role text not null default 'member' check (role in ('owner', 'staff', 'route_setter', 'member')),
  staff_role_id uuid,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  accepted_by uuid references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_token_hash_key unique (token_hash),
  constraint invitations_id_gym_key unique (id, gym_id),
  constraint invitations_staff_role_fkey
    foreign key (staff_role_id, gym_id) references public.staff_roles(id, gym_id) on delete restrict,
  constraint invitations_staff_role_check check (
    staff_role_id is null or role in ('staff', 'route_setter')
  ),
  constraint invitations_acceptance_check check (
    (status = 'accepted') = (accepted_at is not null and accepted_by is not null)
  )
);

create index invitations_gym_status_idx on public.invitations (gym_id, status, expires_at);
create index invitations_email_status_idx on public.invitations (email, status);

create unique index invitations_pending_email_role_idx
on public.invitations (gym_id, email, role)
where status = 'pending';

create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();
