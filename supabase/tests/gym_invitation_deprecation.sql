-- Historical invitation rows remain stored, but no membership-invitation API is exposed.

begin;

do $$
begin
  if to_regclass('public.invitations') is null then
    raise exception 'Historical invitations table was dropped destructively';
  end if;
  if to_regprocedure('public.get_gym_invitation_status(text)') is not null
    or to_regprocedure('public.accept_gym_invitation(text)') is not null
    or to_regprocedure('public.create_staff_invitation(uuid,text,text,text,timestamptz)') is not null
    or to_regprocedure('public.resend_staff_invitation(uuid,text,timestamptz)') is not null
    or to_regprocedure('public.revoke_staff_invitation(uuid)') is not null then
    raise exception 'A deprecated gym invitation RPC remains exposed';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invitations'
  ) then
    raise exception 'A gym invitation RLS policy remains exposed';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform 1 from public.invitations limit 1;
    raise exception 'Authenticated application role retained invitation table access';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
