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

-- A separate synthetic owner and tenant prove the demo is not relying on shared access.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000006','authenticated','authenticated','isolation-owner@crux.example.invalid',extensions.crypt('Crux-Demo-Only-2026!',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Isolation Owner"}',now(),now(),'','','','')
on conflict(id) do nothing;
insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
values('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006','{"sub":"10000000-0000-4000-8000-000000000006","email":"isolation-owner@crux.example.invalid","email_verified":true}','email',now(),now(),now())
on conflict(provider_id,provider) do nothing;
insert into public.profiles(id,display_name,onboarding_completed_at) values('10000000-0000-4000-8000-000000000006','Demo Isolation Owner',now()) on conflict(id) do update set display_name=excluded.display_name,onboarding_completed_at=excluded.onboarding_completed_at;

insert into public.gyms(id,slug,name,legal_name,status,public_join_requests_enabled)
values('30000000-0000-4000-8000-000000000002','demo-summit-lab','Demo Summit Lab','Demo Summit Lab CIC','trial',false)
on conflict(id) do update set name=excluded.name,legal_name=excluded.legal_name,status=excluded.status,public_join_requests_enabled=excluded.public_join_requests_enabled;
insert into public.gym_branding(gym_id,primary_colour,accent_colour,background_colour,welcome_message)
values('30000000-0000-4000-8000-000000000002','#1F2937','#FDBA74','#FFF7ED','A separate fictional tenant used for isolation checks.')
on conflict(gym_id) do update set primary_colour=excluded.primary_colour,accent_colour=excluded.accent_colour,background_colour=excluded.background_colour,welcome_message=excluded.welcome_message;
insert into public.gym_memberships(id,gym_id,profile_id,role,status,joined_at)
values('50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000006','owner','active',now())
on conflict(id) do update set role=excluded.role,status=excluded.status,joined_at=excluded.joined_at;

insert into public.walls(id,gym_id,name,description,sort_order) values
('60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Demo Overhang','Fictional steep training sector.',2),
('60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','Isolation Wall','Visible only inside Demo Summit Lab.',1)
on conflict(id) do nothing;
insert into public.routes(id,gym_id,wall_id,name,colour,grade_system,grade,route_type,status,setter_id,set_on,published_at,description) values
('70000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','Synthetic Sunset','orange','font','6B','boulder','published','10000000-0000-4000-8000-000000000003',current_date-2,now()-interval '2 days','A second fictional route for filters and logbook.'),
('70000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','Tenant Secret Traverse','blue','font','5+','boulder','published','10000000-0000-4000-8000-000000000006',current_date-1,now()-interval '1 day','Isolation-only synthetic route.')
on conflict(id) do nothing;

insert into public.billing_customers(id,gym_id,stripe_customer_id,billing_email) values
('a1000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','cus_DemoCruxCentre','billing@crux.example.invalid'),
('a1000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','cus_DemoSummitLab','billing@crux.example.invalid')
on conflict(id) do nothing;
insert into public.subscriptions(id,gym_id,billing_customer_id,stripe_subscription_id,stripe_price_id,plan_key,status,current_period_start,current_period_end,trial_ends_at) values
('a2000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','sub_DemoCruxCentre','price_DemoGrowth','growth','canceled',now()-interval '30 days',now()-interval '1 day',null),
('a2000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','sub_DemoSummitLab','price_DemoStarter','starter','past_due',now()-interval '30 days',now()+interval '2 days',null)
on conflict(id) do nothing;

insert into public.events(id,gym_id,created_by,title,description,location,starts_at,ends_at,capacity,status,visibility,registration_opens_at,registration_closes_at,published_at,event_type,organiser_id,cancellation_policy) values
('81000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Demo Technique Social','Synthetic movement workshop and social.','Demo Slab',now()+interval '7 days',now()+interval '7 days 2 hours',12,'published','members',now()-interval '1 day',now()+interval '6 days',now(),'workshop','10000000-0000-4000-8000-000000000002','Cancel online until 24 hours before the fictional event.')
on conflict(id) do nothing;
insert into public.ascent_logs(id,gym_id,route_id,profile_id,climbed_at,ascent_type,attempts,notes,session_date,visibility,route_name_snapshot,route_colour_snapshot,route_grade_snapshot,route_grade_system_snapshot,wall_name_snapshot) values
('82000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',now()-interval '1 day','flash',1,'Synthetic demo ascent.',current_date-1,'gym','Lime and Punishment','lime','6A','font','Demo Slab'),
('82000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004',now(),'redpoint',3,'Fictional progress entry.',current_date,'private','Synthetic Sunset','orange','6B','font','Demo Overhang')
on conflict(id) do nothing;
insert into public.community_posts(id,gym_id,author_id,post_type,title,body,visibility,moderation_status,is_pinned,created_at) values
('83000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','achievement','Demo send celebration','Synthetic member completed the fictional lime route.','members','visible',false,now()-interval '4 hours')
on conflict(id) do nothing;
insert into public.chat_channels(id,gym_id,created_by,name,description,channel_type,is_read_only) values
('84000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Demo beta','Fictional route discussion.','community',false)
on conflict(id) do nothing;
insert into public.messages(id,gym_id,channel_id,sender_id,body,created_at) values
('85000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Demo beta: keep hips close on the final move.',now()-interval '2 hours'),
('85000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','Thanks — fictional beta received!',now()-interval '1 hour')
on conflict(id) do nothing;

insert into public.competitions(id,gym_id,created_by,name,description,format,scoring_rules,status,starts_at,ends_at,published_at,registration_opens_at,registration_closes_at,attempt_limit) values
('86000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Demo Boulder League','Synthetic competition for stakeholder evaluation.','tops_zones','{"top_points":100,"zone_points":10}','registration',now()+interval '14 days',now()+interval '14 days 4 hours',now(),now()-interval '1 day',now()+interval '13 days',5)
on conflict(id) do nothing;
insert into public.waivers(id,gym_id,name,description,is_required) values
('87000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Demo participation waiver','Fictional text requiring legal review before any real use.',false)
on conflict(id) do nothing;
insert into public.waiver_versions(id,gym_id,waiver_id,version,title,content,content_hash,status,effective_at,published_at,created_by,requirements) values
('88000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','87000000-0000-4000-8000-000000000001',1,'Demo participation waiver v1','FICTIONAL DEMO ONLY. This is not legal wording and must never be used for real participants.',encode(extensions.digest('demo-waiver-v1','sha256'),'hex'),'published',now()-interval '1 day',now()-interval '1 day','10000000-0000-4000-8000-000000000001','{"minimum_age":18,"consent_items":["I understand this is synthetic demo data"],"collect_date_of_birth":false,"require_age_confirmation":true,"collect_emergency_contact":false}')
on conflict(id) do nothing;
