-- Resumable first-time setup for newly created gym tenants.

alter table public.gyms
  add column setup_current_step smallint,
  add column setup_completed_at timestamptz;

-- Existing tenants pre-date the wizard and must not be sent through it.
update public.gyms
set setup_current_step = 6,
    setup_completed_at = coalesce(updated_at, now());

alter table public.gyms
  alter column setup_current_step set default 1,
  alter column setup_current_step set not null,
  add constraint gyms_setup_current_step_check check (setup_current_step between 1 and 6);

create or replace function public.save_gym_setup_step(
  target_gym_id uuid,
  target_step integer,
  configuration jsonb default '{}'::jsonb
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  saved_step smallint;
  selected_disciplines text[];
  selected_grade_systems text[];
  selected_primary_colour text;
  selected_accent_colour text;
  selected_background_colour text;
begin
  if actor_id is null or not private.has_gym_role(target_gym_id, array['owner']) then
    raise exception 'Gym owner access is required' using errcode = '42501';
  end if;
  if target_step is null or target_step not between 1 and 6 or jsonb_typeof(configuration) <> 'object' then
    raise exception 'Setup step is invalid' using errcode = '22023';
  end if;

  select setup_current_step into saved_step
  from public.gyms where id = target_gym_id for update;
  if saved_step is null then raise exception 'Gym not found' using errcode = 'P0002'; end if;

  if target_step = 1 then
    selected_primary_colour := upper(coalesce(configuration->>'primaryColour', ''));
    selected_accent_colour := upper(coalesce(configuration->>'accentColour', ''));
    selected_background_colour := upper(coalesce(configuration->>'backgroundColour', ''));
    if char_length(trim(coalesce(configuration->>'name', ''))) not between 2 and 120
      or (nullif(trim(configuration->>'contactEmail'), '') is not null and
          (char_length(trim(configuration->>'contactEmail')) > 320 or lower(trim(configuration->>'contactEmail')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
      or char_length(coalesce(configuration->>'contactPhone', '')) > 40
      or selected_primary_colour !~ '^#[0-9A-F]{6}$'
      or selected_accent_colour !~ '^#[0-9A-F]{6}$'
      or selected_background_colour !~ '^#[0-9A-F]{6}$'
      or private.colour_contrast(selected_primary_colour, selected_background_colour) < 4.5 then
      raise exception 'Gym details or brand colours are invalid' using errcode = '22023';
    end if;
    update public.gyms set
      name = trim(configuration->>'name'),
      contact_email = nullif(lower(trim(configuration->>'contactEmail')), ''),
      contact_phone = nullif(trim(configuration->>'contactPhone'), '')
    where id = target_gym_id;
    update public.gym_branding set
      primary_colour = selected_primary_colour,
      accent_colour = selected_accent_colour,
      background_colour = selected_background_colour
    where gym_id = target_gym_id;
  elsif target_step = 2 then
    if char_length(trim(coalesce(configuration->>'addressLine1', ''))) not between 2 and 160
      or char_length(coalesce(configuration->>'addressLine2', '')) > 160
      or char_length(trim(coalesce(configuration->>'city', ''))) not between 2 and 100
      or char_length(trim(coalesce(configuration->>'postcode', ''))) not between 2 and 20
      or upper(trim(coalesce(configuration->>'countryCode', ''))) !~ '^[A-Z]{2}$'
      or char_length(trim(coalesce(configuration->>'timezone', ''))) not between 1 and 80 then
      raise exception 'Location details are invalid' using errcode = '22023';
    end if;
    update public.gyms set
      address_line_1 = trim(configuration->>'addressLine1'),
      address_line_2 = nullif(trim(configuration->>'addressLine2'), ''),
      city = trim(configuration->>'city'), postcode = trim(configuration->>'postcode'),
      country_code = upper(trim(configuration->>'countryCode')),
      timezone = trim(configuration->>'timezone')
    where id = target_gym_id;
  elsif target_step = 3 then
    if jsonb_typeof(configuration->'disciplines') <> 'array'
      or jsonb_array_length(configuration->'disciplines') = 0
      or jsonb_typeof(configuration->'gradeSystems') <> 'array'
      or jsonb_array_length(configuration->'gradeSystems') = 0 then
      raise exception 'Climbing configuration is incomplete' using errcode = '22023';
    end if;
    select array_agg(value) into selected_disciplines from jsonb_array_elements_text(configuration->'disciplines') value;
    select array_agg(trim(value)) into selected_grade_systems from jsonb_array_elements_text(configuration->'gradeSystems') value;
    if not selected_disciplines <@ array['bouldering','sport','trad','speed','training']::text[]
      or exists(select 1 from unnest(selected_grade_systems) value where char_length(value) not between 1 and 30)
      or coalesce(configuration->>'defaultRouteType', '') not in ('boulder','sport','top_rope','trad','training')
      or char_length(trim(coalesce(configuration->>'defaultGrade', ''))) not between 1 and 20 then
      raise exception 'Climbing configuration is invalid' using errcode = '22023';
    end if;
    update public.gyms set
      disciplines = selected_disciplines,
      settings = jsonb_set(settings, '{route_defaults}', jsonb_build_object(
        'grade_systems', selected_grade_systems,
        'default_grade_system', selected_grade_systems[1],
        'default_route_type', configuration->>'defaultRouteType',
        'default_grade', trim(configuration->>'defaultGrade')
      ), true)
    where id = target_gym_id;
  elsif target_step = 4 then
    if not exists(select 1 from public.walls where gym_id = target_gym_id and is_active and archived_at is null) then
      raise exception 'Create at least one active wall or area before continuing' using errcode = '23514';
    end if;
  elsif target_step = 5 then
    update public.gyms set public_join_requests_enabled = coalesce((configuration->>'publicJoinRequestsEnabled')::boolean, false)
    where id = target_gym_id;
  else
    if not exists(select 1 from public.walls where gym_id = target_gym_id and is_active and archived_at is null)
      or not exists(select 1 from public.gyms where id = target_gym_id and cardinality(disciplines) > 0 and address_line_1 is not null and city is not null and postcode is not null) then
      raise exception 'Complete the required setup steps first' using errcode = '23514';
    end if;
    update public.gyms set setup_current_step = 6, setup_completed_at = coalesce(setup_completed_at, now()) where id = target_gym_id;
  end if;

  if target_step < 6 then
    update public.gyms set setup_current_step = greatest(setup_current_step, target_step + 1) where id = target_gym_id
    returning setup_current_step into saved_step;
  else
    saved_step := 6;
  end if;

  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,actor_id,'user',case when target_step=6 then 'gym.setup.completed' else 'gym.setup.step_saved' end,
    'gym',target_gym_id,jsonb_build_object('step',target_step));
  return saved_step;
end;
$$;

revoke all on function public.save_gym_setup_step(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_gym_setup_step(uuid,integer,jsonb) to authenticated,service_role;

comment on function public.save_gym_setup_step(uuid,integer,jsonb) is
  'Owner-only, resumable gym setup mutation using canonical gym, branding and wall records.';
