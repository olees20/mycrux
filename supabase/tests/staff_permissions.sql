-- Canonical staff-role delegation after a person joins through member access.

begin;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000094',
    'manager@crux.example.invalid',
    now(),
    '{"display_name":"Permission Test Manager"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000095',
    'joined-member@crux.example.invalid',
    now(),
    '{"display_name":"Joined Member"}'::jsonb
  );

insert into public.gym_memberships (id, gym_id, profile_id, role, staff_role_id, status, joined_at)
select
  '50000000-0000-4000-8000-000000000094',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000094',
  'staff', role.id, 'active', now()
from public.staff_roles role
where role.gym_id = '30000000-0000-4000-8000-000000000001'
  and role.key = 'gym_manager';

insert into public.gym_memberships (id, gym_id, profile_id, role, status, joined_at)
values (
  '50000000-0000-4000-8000-000000000095',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000095',
  'member', 'active', now()
);

set local role authenticated;

-- Owners may promote an existing joined member to any canonical operational role.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.update_staff_access(
  '50000000-0000-4000-8000-000000000095',
  'gym_manager',
  'active'
);

-- Managers may manage standard staff, but cannot assign managers or change themselves.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000094', true);
select public.update_staff_access(
  '50000000-0000-4000-8000-000000000002',
  'front_desk',
  'suspended'
);

do $$
begin
  begin
    perform public.update_staff_access(
      '50000000-0000-4000-8000-000000000004',
      'gym_manager',
      'active'
    );
    raise exception 'Gym manager assigned another manager';
  exception when insufficient_privilege then null;
  end;

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

-- Route setters, front desk, members and platform admins cannot administer staff.
do $$
declare denied_actor uuid;
begin
  foreach denied_actor in array array[
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid
  ] loop
    perform set_config('request.jwt.claim.sub', denied_actor::text, true);
    begin
      perform public.update_staff_access(
        '50000000-0000-4000-8000-000000000095',
        'front_desk',
        'active'
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
  if not exists (
    select 1 from public.gym_memberships membership
    join public.staff_roles role on role.id = membership.staff_role_id
    where membership.id = '50000000-0000-4000-8000-000000000095'
      and membership.role = 'staff'
      and membership.status = 'active'
      and role.key = 'gym_manager'
  ) then
    raise exception 'Owner promotion of a joined member was not applied';
  end if;
  if not exists (
    select 1 from public.gym_memberships
    where id = '50000000-0000-4000-8000-000000000002'
      and status = 'suspended'
  ) then
    raise exception 'Manager staff suspension was not applied';
  end if;
  if (select count(*) from public.audit_logs where action = 'staff.access.updated') < 2 then
    raise exception 'Staff access changes were not audited';
  end if;
end;
$$;

rollback;
