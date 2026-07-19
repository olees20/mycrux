-- Email-bound invitations expose distinct states and create exactly one server-assigned membership.
begin;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000081','lifecycle@crux.example.invalid',now(),'{"display_name":"Lifecycle Invitee"}'),
  ('10000000-0000-4000-8000-000000000082','used@crux.example.invalid',now(),'{"display_name":"Used Invitee"}');

set local role service_role;
insert into public.invitations(id,gym_id,email,token_hash,role,staff_role_id,status,invited_by,expires_at,accepted_by,accepted_at,revoked_at)
values
  ('92000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','lifecycle@crux.example.invalid',repeat('a',64),'member',null,'pending','10000000-0000-4000-8000-000000000001',now()+interval '1 day',null,null,null),
  ('92000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','lifecycle@crux.example.invalid',repeat('b',64),'member',null,'expired','10000000-0000-4000-8000-000000000001',now()-interval '1 day',null,null,null),
  ('92000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','lifecycle@crux.example.invalid',repeat('c',64),'member',null,'revoked','10000000-0000-4000-8000-000000000001',now()+interval '1 day',null,null,now()),
  ('92000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','used@crux.example.invalid',repeat('d',64),'member',null,'accepted','10000000-0000-4000-8000-000000000001',now()+interval '1 day','10000000-0000-4000-8000-000000000082',now(),null),
  ('92000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','someone-else@crux.example.invalid',repeat('e',64),'member',null,'pending','10000000-0000-4000-8000-000000000001',now()+interval '1 day',null,null,null);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000081',true);

do $$
declare actual text; membership_id uuid;
begin
  select state into actual from public.get_gym_invitation_status(repeat('f',64));
  if actual <> 'invalid' then raise exception 'Invalid invitation state was %',actual; end if;
  select state into actual from public.get_gym_invitation_status(repeat('b',64));
  if actual <> 'expired' then raise exception 'Expired invitation state was %',actual; end if;
  select state into actual from public.get_gym_invitation_status(repeat('c',64));
  if actual <> 'revoked' then raise exception 'Revoked invitation state was %',actual; end if;
  select state into actual from public.get_gym_invitation_status(repeat('d',64));
  if actual <> 'used' then raise exception 'Used invitation state was %',actual; end if;
  select state into actual from public.get_gym_invitation_status(repeat('e',64));
  if actual <> 'wrong_email' then raise exception 'Wrong-email invitation state was %',actual; end if;
  select state into actual from public.get_gym_invitation_status(repeat('a',64));
  if actual <> 'valid' then raise exception 'Valid invitation state was %',actual; end if;

  membership_id := public.accept_gym_invitation(repeat('a',64));
  if membership_id is null then raise exception 'Valid invitation returned no membership'; end if;
  if (select count(*) from public.gym_memberships where gym_id='30000000-0000-4000-8000-000000000001' and profile_id=auth.uid()) <> 1 then
    raise exception 'Invitation created duplicate memberships';
  end if;
  if not exists(select 1 from public.gym_memberships where id=membership_id and role='member' and status='active') then
    raise exception 'Invitation-assigned role was not used';
  end if;
  begin
    perform public.accept_gym_invitation(repeat('a',64));
    raise exception 'Used invitation was accepted twice';
  exception when insufficient_privilege then null; end;
end;
$$;

do $$
begin
  begin perform public.accept_gym_invitation(repeat('b',64)); raise exception 'Expired invitation accepted'; exception when raise_exception then
    if sqlerrm <> 'Invitation has expired' then raise; end if;
  end;
  begin perform public.accept_gym_invitation(repeat('c',64)); raise exception 'Revoked invitation accepted'; exception when raise_exception then
    if sqlerrm <> 'Invitation has been revoked' then raise; end if;
  end;
  begin perform public.accept_gym_invitation(repeat('f',64)); raise exception 'Invalid invitation accepted'; exception when invalid_parameter_value then null; end;
end;
$$;

do $$
begin
  if to_regprocedure('public.accept_gym_invitation(text,text)') is not null then
    raise exception 'Invitation acceptance exposed a role argument';
  end if;
end;
$$;

-- An owner can create, view, rotate and revoke a member invitation.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare invitation_id uuid;
begin
  invitation_id := public.create_staff_invitation(
    '30000000-0000-4000-8000-000000000001',
    'new-member@crux.example.invalid',
    'member',
    repeat('8',64),
    now()+interval '1 day'
  );
  if not exists(select 1 from public.invitations where id=invitation_id and role='member' and staff_role_id is null) then
    raise exception 'Owner could not view the member invitation';
  end if;
  perform public.resend_staff_invitation(invitation_id,repeat('7',64),now()+interval '2 days');
  perform public.revoke_staff_invitation(invitation_id);
  if not exists(select 1 from public.invitations where id=invitation_id and token_hash=repeat('7',64) and status='revoked') then
    raise exception 'Member invitation was not rotated and revoked';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  perform public.accept_gym_invitation(repeat('a',64));
  raise exception 'Anonymous caller accepted an invitation';
exception when insufficient_privilege then null; end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$
begin
  if exists(select 1 from public.invitations) then raise exception 'Member viewed invitation administration data'; end if;
  begin
    perform public.create_staff_invitation('30000000-0000-4000-8000-000000000001','denied@crux.example.invalid','member',repeat('9',64),now()+interval '1 day');
    raise exception 'Member created an invitation';
  exception when insufficient_privilege then null; end;
  begin
    perform public.revoke_staff_invitation('92000000-0000-4000-8000-000000000005');
    raise exception 'Member revoked an invitation';
  exception when insufficient_privilege then null; end;
  begin
    perform public.resend_staff_invitation('92000000-0000-4000-8000-000000000005',repeat('6',64),now()+interval '1 day');
    raise exception 'Member resent an invitation';
  exception when insufficient_privilege then null; end;
end;
$$;

rollback;
