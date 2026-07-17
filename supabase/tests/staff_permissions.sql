-- Prompt 8 staff-role delegation, audit, and RPC boundary tests. Run after migrations and seed.

begin;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  '10000000-0000-4000-8000-000000000094',
  'manager@crux.example.invalid',
  now(),
  '{"display_name":"Permission Test Manager"}'::jsonb
);

insert into public.gym_memberships (
  id, gym_id, profile_id, role, staff_role_id, status, joined_at
)
select
  '50000000-0000-4000-8000-000000000094',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000094',
  'staff', role.id, 'active', now()
from public.staff_roles role
where role.gym_id = '30000000-0000-4000-8000-000000000001'
  and role.key = 'gym_manager';

set local role authenticated;

-- Owners can assign managers, rotate/revoke their links, and every change is audited.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
declare
  invitation_id uuid;
begin
  invitation_id := public.create_staff_invitation(
    '30000000-0000-4000-8000-000000000001',
    'new-manager@crux.example.invalid',
    'gym_manager',
    repeat('a', 64),
    now() + interval '7 days'
  );
  perform public.resend_staff_invitation(invitation_id, repeat('b', 64), now() + interval '7 days');
  perform public.revoke_staff_invitation(invitation_id);
end;
$$;

-- Managers may invite and suspend standard staff, but may not assign managers.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000094', true);
do $$
begin
  perform public.create_staff_invitation(
    '30000000-0000-4000-8000-000000000001',
    'new-front-desk@crux.example.invalid',
    'front_desk',
    repeat('c', 64),
    now() + interval '7 days'
  );

  begin
    perform public.create_staff_invitation(
      '30000000-0000-4000-8000-000000000001',
      'another-manager@crux.example.invalid',
      'gym_manager',
      repeat('d', 64),
      now() + interval '7 days'
    );
    raise exception 'Gym manager assigned another manager';
  exception when insufficient_privilege then null;
  end;

  perform public.update_staff_access(
    '50000000-0000-4000-8000-000000000002',
    'front_desk',
    'suspended'
  );

  begin
    perform public.update_staff_access(
      '50000000-0000-4000-8000-000000000094',
      'front_desk',
      'suspended'
    );
    raise exception 'Gym manager changed their own access';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Route setters, front desk, members, and platform admins without membership cannot administer staff.
do $$
declare
  denied_actor uuid;
begin
  foreach denied_actor in array array[
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid
  ] loop
    perform set_config('request.jwt.claim.sub', denied_actor::text, true);
    begin
      perform public.create_staff_invitation(
        '30000000-0000-4000-8000-000000000001',
        'denied-' || denied_actor::text || '@crux.example.invalid',
        'front_desk',
        repeat('e', 64),
        now() + interval '7 days'
      );
      raise exception 'Non-manager actor % administered staff', denied_actor;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

set local role service_role;
do $$
begin
  if (select count(*) from public.audit_logs where action = 'staff.invitation.created') <> 2 then
    raise exception 'Expected two audited invitation creations';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'staff.invitation.resent')
    or not exists (select 1 from public.audit_logs where action = 'staff.invitation.revoked')
    or not exists (select 1 from public.audit_logs where action = 'staff.access.updated') then
    raise exception 'A staff access mutation was not audited';
  end if;
  if not exists (select 1 from public.notifications where notification_type='invitation.created')
    or not exists (select 1 from public.notifications where notification_type='invitation.revoked') then
    raise exception 'Invitation lifecycle notifications were not generated';
  end if;
  if exists (
    select 1 from public.audit_logs
    where metadata::text like '%aaaaaaaaaaaaaaaa%'
       or metadata::text like '%bbbbbbbbbbbbbbbb%'
       or metadata::text like '%cccccccccccccccc%'
  ) then
    raise exception 'An invitation token leaked into audit metadata';
  end if;
  if not exists (
    select 1 from public.gym_memberships
    where id = '50000000-0000-4000-8000-000000000002' and status = 'suspended'
  ) then
    raise exception 'Manager staff suspension was not applied';
  end if;
end;
$$;

rollback;
