-- Authentication profile bootstrap and removal of direct membership insertion.

begin;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000091',
    'new-climber@crux.example.invalid',
    null,
    '{"display_name":"New Climber"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000093',
    'direct-membership@crux.example.invalid',
    null,
    '{"display_name":"Direct Membership Test"}'::jsonb
  );

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000091'
      and display_name = 'New Climber'
  ) then
    raise exception 'Auth user trigger did not create the expected profile';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000093', true);

do $$
begin
  begin
    insert into public.gym_memberships (gym_id, profile_id, role, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000093',
      'member',
      'active'
    );
    raise exception 'Direct public membership insertion remained available';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
