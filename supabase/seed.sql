-- Repeatable local/demo seed. All identities use reserved example.invalid addresses.
-- The shared demo password is intentionally non-secret and must never be used outside local/staging.

select set_config('request.jwt.claim.role', 'service_role', false);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner@crux.example.invalid',
    extensions.crypt('Crux-Demo-Only-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Owner"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'staff@crux.example.invalid',
    extensions.crypt('Crux-Demo-Only-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Staff"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'setter@crux.example.invalid',
    extensions.crypt('Crux-Demo-Only-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Setter"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'member@crux.example.invalid',
    extensions.crypt('Crux-Demo-Only-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Member"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'admin@crux.example.invalid',
    extensions.crypt('Crux-Demo-Only-2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Platform Admin"}'::jsonb, now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"owner@crux.example.invalid","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"staff@crux.example.invalid","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '{"sub":"10000000-0000-4000-8000-000000000003","email":"setter@crux.example.invalid","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    '{"sub":"10000000-0000-4000-8000-000000000004","email":"member@crux.example.invalid","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    '{"sub":"10000000-0000-4000-8000-000000000005","email":"admin@crux.example.invalid","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  )
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, display_name, is_platform_admin, onboarding_completed_at)
values
  ('10000000-0000-4000-8000-000000000001', 'Demo Owner', false, now()),
  ('10000000-0000-4000-8000-000000000002', 'Demo Staff', false, now()),
  ('10000000-0000-4000-8000-000000000003', 'Demo Setter', false, now()),
  ('10000000-0000-4000-8000-000000000004', 'Demo Member', false, now()),
  ('10000000-0000-4000-8000-000000000005', 'Demo Platform Admin', true, now())
on conflict (id) do update
set display_name = excluded.display_name,
    is_platform_admin = excluded.is_platform_admin,
    onboarding_completed_at = excluded.onboarding_completed_at;

insert into public.gyms (
  id, slug, name, legal_name, status, public_join_requests_enabled
)
values (
  '30000000-0000-4000-8000-000000000001',
  'demo-crux-centre',
  'Demo Crux Centre',
  'Demo Crux Centre Ltd',
  'trial',
  true
)
on conflict (id) do update
set name = excluded.name,
    legal_name = excluded.legal_name,
    status = excluded.status,
    public_join_requests_enabled = excluded.public_join_requests_enabled;

insert into public.gym_branding (
  gym_id, primary_colour, accent_colour, background_colour, welcome_message
)
values (
  '30000000-0000-4000-8000-000000000001',
  '#17211B', '#D9FF45', '#F7F7F2',
  'Welcome to the fictional Crux demo gym.'
)
on conflict (gym_id) do update
set primary_colour = excluded.primary_colour,
    accent_colour = excluded.accent_colour,
    background_colour = excluded.background_colour,
    welcome_message = excluded.welcome_message;

insert into public.staff_roles (
  id, gym_id, key, name, description, capabilities, is_system
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'front_desk', 'Front desk', 'Demo front-of-house role.',
    array['events.manage', 'guests.manage', 'guests.check_in', 'waivers.manage', 'passes.manage'], true
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'route_setter', 'Route setter', 'Demo route-setting role.',
    array['walls.read', 'routes.manage', 'route_feedback.read', 'competitions.score'], true
  )
on conflict (gym_id, key) do update
set name = excluded.name,
    description = excluded.description,
    capabilities = excluded.capabilities,
    is_system = excluded.is_system;

insert into public.gym_memberships (
  id, gym_id, profile_id, role, staff_role_id, status, joined_at
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'owner', null, 'active', now()
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    'member', null, 'active', now()
  )
on conflict (id) do update
set role = excluded.role,
    staff_role_id = excluded.staff_role_id,
    status = excluded.status,
    joined_at = excluded.joined_at;

insert into public.gym_memberships (
  id, gym_id, profile_id, role, staff_role_id, status, joined_at
)
select
  '50000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'staff', role.id, 'active', now()
from public.staff_roles role
where role.gym_id = '30000000-0000-4000-8000-000000000001' and role.key = 'front_desk'
on conflict (id) do update
set role = excluded.role,
    staff_role_id = excluded.staff_role_id,
    status = excluded.status,
    joined_at = excluded.joined_at;

insert into public.gym_memberships (
  id, gym_id, profile_id, role, staff_role_id, status, joined_at
)
select
  '50000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003',
  'route_setter', role.id, 'active', now()
from public.staff_roles role
where role.gym_id = '30000000-0000-4000-8000-000000000001' and role.key = 'route_setter'
on conflict (id) do update
set role = excluded.role,
    staff_role_id = excluded.staff_role_id,
    status = excluded.status,
    joined_at = excluded.joined_at;

insert into public.guest_invites (
  id, gym_id, invited_by, email, guest_name, token_hash, status, expires_at
)
values (
  '55000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'guest@crux.example.invalid',
  'Demo Guest',
  encode(extensions.digest('crux-demo-guest-token', 'sha256'), 'hex'),
  'pending',
  now() + interval '30 days'
)
on conflict (id) do update
set email = excluded.email,
    guest_name = excluded.guest_name,
    token_hash = excluded.token_hash,
    status = excluded.status,
    expires_at = excluded.expires_at;

insert into public.walls (id, gym_id, name, description, sort_order)
values (
  '60000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Demo Slab', 'A fictional wall for local development.', 1
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.routes (
  id, gym_id, wall_id, name, colour, grade_system, grade, route_type,
  status, setter_id, set_on, published_at, description
)
values (
  '70000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'Lime and Punishment', 'lime', 'font', '6A', 'boulder',
  'published', '10000000-0000-4000-8000-000000000003', current_date, now(),
  'Synthetic demonstration route; not a real climb.'
)
on conflict (id) do update
set name = excluded.name,
    colour = excluded.colour,
    grade = excluded.grade,
    status = excluded.status,
    setter_id = excluded.setter_id,
    published_at = excluded.published_at;

insert into public.announcements (
  id, gym_id, author_id, title, body, status, audience, published_at
)
values (
  '80000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Welcome to the demo',
  'This announcement contains fictional development data only.',
  'published', 'members', now()
)
on conflict (id) do update
set title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    audience = excluded.audience,
    published_at = excluded.published_at;
