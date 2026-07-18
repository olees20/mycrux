-- Prompt 9: gym tenant details, controlled slugs, accessible branding, and logo storage.

alter table public.gyms
  add column address_line_1 text,
  add column address_line_2 text,
  add column city text,
  add column postcode text,
  add column contact_email text,
  add column contact_phone text,
  add column disciplines text[] not null default '{}',
  add column opening_hours_text text;

alter table public.gyms
  add constraint gyms_address_line_1_check check (address_line_1 is null or char_length(address_line_1) <= 160),
  add constraint gyms_address_line_2_check check (address_line_2 is null or char_length(address_line_2) <= 160),
  add constraint gyms_city_check check (city is null or char_length(city) <= 100),
  add constraint gyms_postcode_check check (postcode is null or char_length(postcode) <= 20),
  add constraint gyms_contact_email_check check (contact_email is null or (contact_email = lower(contact_email) and char_length(contact_email) <= 320)),
  add constraint gyms_contact_phone_check check (contact_phone is null or char_length(contact_phone) <= 40),
  add constraint gyms_disciplines_check check (disciplines <@ array['bouldering', 'sport', 'trad', 'speed', 'training']::text[]),
  add constraint gyms_opening_hours_check check (opening_hours_text is null or char_length(opening_hours_text) <= 2000),
  add constraint gyms_slug_reserved_check check (slug <> all(array['admin','api','app','auth','billing','create','help','login','onboarding','register','settings','staff','support','www']));

create table public.gym_slug_history (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete restrict,
  previous_slug text not null,
  changed_to_slug text not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint gym_slug_history_previous_key unique (previous_slug),
  constraint gym_slug_history_id_gym_key unique (id, gym_id)
);

create index gym_slug_history_gym_time_idx on public.gym_slug_history (gym_id, changed_at desc);
alter table public.gym_slug_history enable row level security;
alter table public.gym_slug_history force row level security;
grant select on public.gym_slug_history to authenticated;
grant all on public.gym_slug_history to service_role;
create policy gym_slug_history_select_owner on public.gym_slug_history
for select to authenticated using (private.has_gym_role(gym_id, array['owner']));

create or replace function private.relative_luminance(hex_colour text)
returns double precision
language plpgsql immutable strict
set search_path = ''
as $$
declare
  bytes bytea := decode(substr(hex_colour, 2), 'hex');
  channel double precision;
  result double precision := 0;
  weights double precision[] := array[0.2126, 0.7152, 0.0722];
  channel_index integer;
begin
  if hex_colour !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Invalid colour' using errcode = '22023'; end if;
  for channel_index in 0..2 loop
    channel := get_byte(bytes, channel_index) / 255.0;
    channel := case when channel <= 0.03928 then channel / 12.92 else power((channel + 0.055) / 1.055, 2.4) end;
    result := result + channel * weights[channel_index + 1];
  end loop;
  return result;
end;
$$;

create or replace function private.colour_contrast(first_colour text, second_colour text)
returns double precision language sql immutable strict set search_path = '' as $$
  select (greatest(private.relative_luminance(first_colour), private.relative_luminance(second_colour)) + 0.05)
       / (least(private.relative_luminance(first_colour), private.relative_luminance(second_colour)) + 0.05);
$$;

create or replace function public.update_gym_configuration(
  target_gym_id uuid, gym_name text, gym_slug text, gym_timezone text, gym_country_code text,
  gym_address_line_1 text, gym_address_line_2 text, gym_city text, gym_postcode text,
  gym_contact_email text, gym_contact_phone text, gym_disciplines text[], gym_opening_hours_text text,
  allow_public_join_requests boolean, brand_primary_colour text, brand_accent_colour text,
  brand_background_colour text, brand_welcome_message text
)
returns text language plpgsql security definer set search_path = '' as $$
declare old_slug text; actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.has_gym_role(target_gym_id, array['owner']) then raise exception 'Gym owner access is required' using errcode = '42501'; end if;
  gym_slug := lower(trim(gym_slug)); gym_contact_email := lower(trim(gym_contact_email)); gym_country_code := upper(trim(gym_country_code));
  if gym_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(gym_slug) not between 3 and 63
    or gym_slug = any(array['admin','api','app','auth','billing','create','help','login','onboarding','register','settings','staff','support','www']) then raise exception 'Gym slug is invalid or reserved' using errcode = '22023'; end if;
  if private.colour_contrast(brand_primary_colour, brand_background_colour) < 4.5 then raise exception 'Brand colours do not meet accessible contrast' using errcode = '22023'; end if;
  select slug into old_slug from public.gyms where id = target_gym_id for update;
  update public.gyms set name=trim(gym_name), slug=gym_slug, timezone=gym_timezone, country_code=gym_country_code,
    address_line_1=trim(gym_address_line_1), address_line_2=nullif(trim(gym_address_line_2),''), city=trim(gym_city), postcode=trim(gym_postcode),
    contact_email=gym_contact_email, contact_phone=nullif(trim(gym_contact_phone),''), disciplines=gym_disciplines,
    opening_hours_text=trim(gym_opening_hours_text), public_join_requests_enabled=allow_public_join_requests where id=target_gym_id;
  insert into public.gym_branding (gym_id,primary_colour,accent_colour,background_colour,welcome_message)
    values(target_gym_id,upper(brand_primary_colour),upper(brand_accent_colour),upper(brand_background_colour),nullif(trim(brand_welcome_message),''))
    on conflict(gym_id) do update set primary_colour=excluded.primary_colour,accent_colour=excluded.accent_colour,background_colour=excluded.background_colour,welcome_message=excluded.welcome_message;
  if old_slug <> gym_slug then insert into public.gym_slug_history(gym_id,previous_slug,changed_to_slug,changed_by) values(target_gym_id,old_slug,gym_slug,actor_id); end if;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
    values(target_gym_id,actor_id,'user','gym.configuration.updated','gym',target_gym_id,jsonb_build_object('slug_changed',old_slug<>gym_slug));
  return gym_slug;
end; $$;

create or replace function public.create_gym_tenant(
  actor_profile_id uuid,
  owner_profile_id uuid,
  configuration jsonb,
  branding jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_gym_id uuid;
  requested_slug text := lower(trim(configuration->>'slug'));
  primary_colour text := upper(branding->>'primaryColour');
  accent_colour text := upper(branding->>'accentColour');
  background_colour text := upper(branding->>'backgroundColour');
begin
  if current_user <> 'service_role' and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service role is required' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=actor_profile_id and is_platform_admin) then
    raise exception 'Authorised platform actor is required' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=owner_profile_id) then raise exception 'Owner profile is invalid' using errcode='22023'; end if;
  if requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(requested_slug) not between 3 and 63
    or requested_slug = any(array['admin','api','app','auth','billing','create','help','login','onboarding','register','settings','staff','support','www']) then raise exception 'Gym slug is invalid or reserved' using errcode='22023'; end if;
  if private.colour_contrast(primary_colour,background_colour) < 4.5 then raise exception 'Brand colours do not meet accessible contrast' using errcode='22023'; end if;

  insert into public.gyms(name,slug,timezone,country_code,status,address_line_1,address_line_2,city,postcode,contact_email,contact_phone,disciplines,opening_hours_text,public_join_requests_enabled)
  values(trim(configuration->>'name'),requested_slug,configuration->>'timezone',upper(configuration->>'countryCode'),'trial',trim(configuration->>'addressLine1'),nullif(trim(configuration->>'addressLine2'),''),trim(configuration->>'city'),trim(configuration->>'postcode'),lower(configuration->>'contactEmail'),nullif(trim(configuration->>'contactPhone'),''),array(select jsonb_array_elements_text(configuration->'disciplines')),trim(configuration->>'openingHoursText'),coalesce((configuration->>'publicJoinRequestsEnabled')::boolean,false))
  returning id into new_gym_id;
  insert into public.gym_branding(gym_id,primary_colour,accent_colour,background_colour,welcome_message)
  values(new_gym_id,primary_colour,accent_colour,background_colour,nullif(trim(branding->>'welcomeMessage'),''));
  insert into public.gym_memberships(gym_id,profile_id,role,status,joined_at)
  values(new_gym_id,owner_profile_id,'owner','active',now());
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(new_gym_id,actor_profile_id,'platform_admin','gym.created','gym',new_gym_id,jsonb_build_object('owner_profile_id',owner_profile_id));
  return new_gym_id;
end; $$;

create or replace function public.set_gym_logo_path(target_gym_id uuid, object_path text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_gym_role(target_gym_id,array['owner']) then raise exception 'Gym owner access is required' using errcode='42501'; end if;
  if object_path !~ ('^' || target_gym_id::text || '/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$') then raise exception 'Logo path is invalid' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects where bucket_id='gym-branding' and name=object_path) then raise exception 'Uploaded logo object does not exist' using errcode='22023'; end if;
  update public.gym_branding set logo_path=object_path where gym_id=target_gym_id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
    values(target_gym_id,auth.uid(),'user','gym.logo.updated','gym',target_gym_id,'{}');
  return object_path;
end; $$;

revoke update on public.gyms from authenticated;
revoke insert, update, delete on public.gym_branding from authenticated;
revoke all on function public.update_gym_configuration(uuid,text,text,text,text,text,text,text,text,text,text,text[],text,boolean,text,text,text,text) from public,anon;
revoke all on function public.set_gym_logo_path(uuid,text) from public,anon;
revoke all on function public.create_gym_tenant(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.update_gym_configuration(uuid,text,text,text,text,text,text,text,text,text,text,text[],text,boolean,text,text,text,text) to authenticated,service_role;
grant execute on function public.set_gym_logo_path(uuid,text) to authenticated,service_role;
grant execute on function public.create_gym_tenant(uuid,uuid,jsonb,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gym-branding','gym-branding',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy gym_branding_objects_select on storage.objects for select to authenticated
using(bucket_id='gym-branding' and private.current_membership_id((storage.foldername(name))[1]::uuid) is not null);
create policy gym_branding_objects_insert on storage.objects for insert to authenticated
with check(bucket_id='gym-branding' and private.has_gym_role((storage.foldername(name))[1]::uuid,array['owner']));
create policy gym_branding_objects_update on storage.objects for update to authenticated
using(bucket_id='gym-branding' and private.has_gym_role((storage.foldername(name))[1]::uuid,array['owner']))
with check(bucket_id='gym-branding' and private.has_gym_role((storage.foldername(name))[1]::uuid,array['owner']));
create policy gym_branding_objects_delete on storage.objects for delete to authenticated
using(bucket_id='gym-branding' and private.has_gym_role((storage.foldername(name))[1]::uuid,array['owner']));
