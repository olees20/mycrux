-- Prompt 6 authentication/onboarding policy tests. Run after migrations and seed.

begin;

insert into auth.users (
  id, email, email_confirmed_at, raw_user_meta_data
)
values
  (
    '10000000-0000-4000-8000-000000000091',
    'invitee@crux.example.invalid',
    now(),
    '{"display_name":"Invited Climber"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000092',
    'unverified@crux.example.invalid',
    null,
    '{"display_name":"Unverified Climber"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000093',
    'public-request@crux.example.invalid',
    now(),
    '{"display_name":"Public Request Climber"}'::jsonb
  );

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000091'
      and display_name = 'Invited Climber'
  ) then
    raise exception 'Auth user trigger did not create the expected profile';
  end if;
end;
$$;

insert into public.invitations (
  id, gym_id, email, token_hash, role, staff_role_id, invited_by, expires_at
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'invitee@crux.example.invalid',
    '242ae763272c94fd83aaff5fe1102118e762859b17b98a3ad239bdf28b1c7a1b',
    'staff',
    (select id from public.staff_roles where gym_id = '30000000-0000-4000-8000-000000000001' and key = 'front_desk'),
    '10000000-0000-4000-8000-000000000001',
    now() + interval '1 day'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'unverified@crux.example.invalid',
    'da6ebd33002941d839c6a18f764e61488302b938512b217e7ce208570c06eb3e',
    'member', null,
    '10000000-0000-4000-8000-000000000001',
    now() + interval '1 day'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000091', true);

do $$
declare
  membership_id uuid;
begin
  select public.accept_gym_invitation(
    '242ae763272c94fd83aaff5fe1102118e762859b17b98a3ad239bdf28b1c7a1b'
  ) into membership_id;

  if membership_id is null then
    raise exception 'Invitation did not return a membership';
  end if;

  begin
    perform public.accept_gym_invitation(
      '242ae763272c94fd83aaff5fe1102118e762859b17b98a3ad239bdf28b1c7a1b'
    );
    raise exception 'Single-use invitation was accepted twice';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- A verified user may request a public gym only as an invited member, never as staff/owner.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000093', true);

insert into public.gym_memberships (
  gym_id, profile_id, role, status
)
values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000093',
  'member', 'invited'
);

do $$
begin
  begin
    insert into public.gym_memberships (
      gym_id, profile_id, role, status, joined_at
    )
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000093',
      'owner', 'active', now()
    );
    raise exception 'Public join request escalated to owner';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role service_role;
do $$
begin
  if not exists (
    select 1 from public.gym_memberships
    where profile_id = '10000000-0000-4000-8000-000000000091'
      and role = 'staff'
      and status = 'active'
  ) then
    raise exception 'Staff invitation assigned the wrong membership';
  end if;

  if not exists (
    select 1 from public.invitations
    where id = '91000000-0000-4000-8000-000000000001'
      and status = 'accepted'
      and accepted_by = '10000000-0000-4000-8000-000000000091'
  ) then
    raise exception 'Invitation acceptance state was not recorded';
  end if;

  if not exists (
    select 1 from public.audit_logs
    where target_id = '91000000-0000-4000-8000-000000000001'
      and action = 'staff.invitation.accepted'
  ) then
    raise exception 'Invitation acceptance was not audited';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000092', true);

do $$
begin
  begin
    perform public.accept_gym_invitation(
      'da6ebd33002941d839c6a18f764e61488302b938512b217e7ce208570c06eb3e'
    );
    raise exception 'Unverified account accepted an invitation';
  exception
    when invalid_authorization_specification then null;
  end;

  begin
    insert into public.gym_memberships (
      gym_id, profile_id, role, status
    )
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000092',
      'member', 'invited'
    );
    raise exception 'Unverified account submitted a public join request';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
