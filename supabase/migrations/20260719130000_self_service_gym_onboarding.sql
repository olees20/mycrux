-- Caller-bound, atomic first-gym creation for verified membership-empty users.
alter table public.gyms
  add column website_url text,
  add constraint gyms_website_url_check check (
    website_url is null
    or (char_length(website_url) <= 2048 and website_url ~ '^https?://[^[:space:]]+$')
  );

create or replace function public.is_gym_slug_available(requested_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and lower(btrim(requested_slug)) ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(lower(btrim(requested_slug))) between 3 and 63
    and lower(btrim(requested_slug)) <> all(array['admin','api','app','auth','billing','create','help','login','onboarding','register','settings','staff','support','www'])
    and not exists (
      select 1 from public.gyms gym where gym.slug = lower(btrim(requested_slug))
    );
$$;

create or replace function public.create_my_first_gym(configuration jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  new_gym_id uuid;
  requested_name text := btrim(configuration->>'name');
  requested_slug text := lower(btrim(configuration->>'slug'));
  requested_email text := nullif(lower(btrim(coalesce(configuration->>'contactEmail', ''))), '');
  requested_phone text := nullif(btrim(coalesce(configuration->>'contactPhone', '')), '');
  requested_website text := nullif(btrim(coalesce(configuration->>'websiteUrl', '')), '');
  requested_address_1 text := nullif(btrim(coalesce(configuration->>'addressLine1', '')), '');
  requested_address_2 text := nullif(btrim(coalesce(configuration->>'addressLine2', '')), '');
  requested_city text := nullif(btrim(coalesce(configuration->>'city', '')), '');
  requested_postcode text := nullif(btrim(coalesce(configuration->>'postcode', '')), '');
  requested_country text := upper(btrim(coalesce(configuration->>'countryCode', 'GB')));
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  -- Concurrent submissions for one account must observe the first transaction's membership.
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));

  if not private.is_current_email_verified() then
    raise exception 'A verified email is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = actor_id
      and profile.suspended_at is null
      and profile.deleted_at is null
      and profile.deactivated_at is null
  ) then
    raise exception 'An active profile is required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.gym_memberships membership
    where membership.profile_id = actor_id and membership.status = 'active'
  ) then
    raise exception 'An active gym membership already exists' using errcode = '42501';
  end if;

  if jsonb_typeof(configuration) <> 'object'
    or char_length(requested_name) not between 2 and 120
    or requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(requested_slug) not between 3 and 63
    or requested_slug = any(array['admin','api','app','auth','billing','create','help','login','onboarding','register','settings','staff','support','www'])
    or requested_country !~ '^[A-Z]{2}$'
    or (requested_email is not null and (char_length(requested_email) > 320 or requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    or (requested_phone is not null and char_length(requested_phone) > 40)
    or (requested_website is not null and (char_length(requested_website) > 2048 or requested_website !~ '^https?://[^[:space:]]+$'))
    or (requested_address_1 is not null and char_length(requested_address_1) > 160)
    or (requested_address_2 is not null and char_length(requested_address_2) > 160)
    or (requested_city is not null and char_length(requested_city) > 100)
    or (requested_postcode is not null and char_length(requested_postcode) > 20) then
    raise exception 'Gym configuration is invalid' using errcode = '22023';
  end if;

  insert into public.gyms (
    name, slug, timezone, country_code, status, address_line_1, address_line_2,
    city, postcode, contact_email, contact_phone, website_url, disciplines,
    public_join_requests_enabled
  ) values (
    requested_name, requested_slug, 'Europe/London', requested_country, 'trial',
    requested_address_1, requested_address_2, requested_city, requested_postcode,
    requested_email, requested_phone, requested_website, array['bouldering']::text[], false
  ) returning id into new_gym_id;

  insert into public.gym_branding (gym_id, primary_colour, accent_colour, background_colour)
  values (new_gym_id, '#17211B', '#D9FF45', '#F7F7F2');

  -- The existing gym trigger provisions canonical system staff roles. `owner` is the
  -- highest tenant role and is intentionally derived from auth.uid(), never input.
  insert into public.gym_memberships (gym_id, profile_id, role, status, joined_at)
  values (new_gym_id, actor_id, 'owner', 'active', now());

  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = actor_id;
  insert into public.audit_logs (gym_id, actor_profile_id, actor_type, action, target_type, target_id, metadata)
  values (new_gym_id, actor_id, 'user', 'gym.self_created', 'gym', new_gym_id, '{}');

  return new_gym_id;
exception
  when unique_violation then
    raise exception 'That gym address is already in use' using errcode = '23505';
end;
$$;

revoke all on function public.is_gym_slug_available(text) from public, anon;
revoke all on function public.create_my_first_gym(jsonb) from public, anon;
grant execute on function public.is_gym_slug_available(text) to authenticated, service_role;
grant execute on function public.create_my_first_gym(jsonb) to authenticated, service_role;

comment on function public.is_gym_slug_available(text) is
  'Returns only whether a syntactically valid gym URL slug is currently unclaimed.';
comment on function public.create_my_first_gym(jsonb) is
  'Atomically creates one trial gym for the verified membership-empty caller and assigns only that caller as owner.';
