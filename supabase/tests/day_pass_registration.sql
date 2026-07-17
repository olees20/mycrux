-- Prompt 16 public/member registration, payment boundaries, verification and check-in.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.configure_day_pass_registration('30000000-0000-4000-8000-000000000001',true,16,'Pay at reception.');
do $$ declare version_id uuid; begin
  version_id:=public.save_waiver_draft('30000000-0000-4000-8000-000000000001',null,'Day pass waiver','',true,'Day pass waiver','Test waiver text','{"collect_date_of_birth":false,"require_age_confirmation":true,"minimum_age":18,"collect_emergency_contact":false,"consent_items":["I accept"]}'::jsonb);
  perform public.publish_waiver_version('30000000-0000-4000-8000-000000000001',version_id);
end; $$;

set local role service_role;
select public.register_public_day_pass('demo-crux-centre','Public Visitor','visitor@example.invalid',repeat('a',64),repeat('b',64),'pay_at_reception');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.create_guest_pass('30000000-0000-4000-8000-000000000001','Member Guest','',repeat('c',64),repeat('d',64),'integration_placeholder');
do $$ begin
  begin perform public.verify_guest_pass('30000000-0000-4000-8000-000000000001',repeat('b',64)); raise exception 'Member verified a guest pass'; exception when insufficient_privilege then null; end;
  begin insert into public.passes(gym_id,guest_invite_id,pass_type,reference_code_hash,valid_from) values('30000000-0000-4000-8000-000000000001','55000000-0000-4000-8000-000000000001','day_pass',repeat('e',64),now()); raise exception 'Member bypassed guest-pass RPC'; exception when insufficient_privilege then null; end;
end; $$;

set local role service_role;
do $$ declare version_id uuid; begin
  select id into version_id from public.waiver_versions where title='Day pass waiver';
  perform public.accept_guest_waiver(repeat('a',64),version_id,'{"accepted_name":"Public Visitor","signature_text":"Public Visitor","date_of_birth":"","age_confirmed":true,"emergency_contact_name":"","emergency_contact_phone":"","consents":["I accept"],"user_agent":"SQL"}'::jsonb);
  perform public.accept_guest_waiver(repeat('c',64),version_id,'{"accepted_name":"Member Guest","signature_text":"Member Guest","date_of_birth":"","age_confirmed":true,"emergency_contact_name":"","emergency_contact_phone":"","consents":["I accept"],"user_agent":"SQL"}'::jsonb);
end; $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ declare verification jsonb; public_pass uuid; member_pass uuid; begin
  verification:=public.verify_guest_pass('30000000-0000-4000-8000-000000000001',repeat('b',64));
  if verification->>'guest_name'<>'Public Visitor' or verification->>'payment_state'<>'unpaid' or (verification->>'waivers_complete')::boolean is not true then raise exception 'Sanitised verification result is incorrect'; end if;
  if verification ? 'email' or verification ? 'date_of_birth' or verification ? 'emergency_contact' then raise exception 'Verification leaked unnecessary guest data'; end if;
  begin perform public.check_in_guest_pass('30000000-0000-4000-8000-000000000001',repeat('b',64),false); raise exception 'Unpaid pass checked in without reception confirmation'; exception when raise_exception then null; end;
  public_pass:=public.check_in_guest_pass('30000000-0000-4000-8000-000000000001',repeat('b',64),true);
  begin perform public.check_in_guest_pass('30000000-0000-4000-8000-000000000001',repeat('b',64),true); raise exception 'Pass reference replay succeeded'; exception when raise_exception then null; end;
  select id into member_pass from public.passes where reference_code_hash=repeat('d',64);
  perform public.revoke_guest_pass('30000000-0000-4000-8000-000000000001',member_pass);
  if not exists(select 1 from public.passes where id=public_pass and status='used' and payment_state='confirmed' and external_payment_reference is null) then raise exception 'Check-in or platform payment boundary is incorrect'; end if;
  if not exists(select 1 from public.passes where id=member_pass and status='revoked') then raise exception 'Pass revocation failed'; end if;
end; $$;

set local role service_role;
do $$ begin
  if exists(select 1 from public.passes where reference_code_hash !~ '^[a-f0-9]{64}$') then raise exception 'Raw or sequential pass reference was stored'; end if;
  if not exists(select 1 from public.audit_logs where action='guest.checked_in') or not exists(select 1 from public.audit_logs where action='guest.pass.revoked') then raise exception 'Guest operations were not audited'; end if;
end; $$;

rollback;
