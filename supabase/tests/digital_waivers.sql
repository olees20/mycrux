-- Prompt 15 immutability, requirements, member/guest acceptance, and access tests.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

do $$ declare version_id uuid; begin
  version_id:=public.save_waiver_draft('30000000-0000-4000-8000-000000000001',null,'Entry waiver','Test template',true,'Entry waiver v1','Exact legal text version one','{"collect_date_of_birth":true,"require_age_confirmation":true,"minimum_age":18,"collect_emergency_contact":true,"consent_items":["I read the waiver","I accept the risks"]}'::jsonb);
  perform public.publish_waiver_version('30000000-0000-4000-8000-000000000001',version_id);
end; $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ declare version_id uuid; acceptance_id uuid; begin
  select id into version_id from public.waiver_versions where title='Entry waiver v1';
  acceptance_id:=public.accept_member_waiver('30000000-0000-4000-8000-000000000001',version_id,'{"accepted_name":"Demo Member","signature_text":"Demo Member","date_of_birth":"1990-01-01","age_confirmed":true,"emergency_contact_name":"Test Contact","emergency_contact_phone":"000000","consents":["I read the waiver","I accept the risks"],"user_agent":"SQL test"}'::jsonb);
  if not exists(select 1 from public.waiver_acceptances where id=acceptance_id and profile_id=auth.uid() and evidence->>'content_hash' is not null) then raise exception 'Member acceptance evidence is incomplete'; end if;
  begin
    perform public.accept_member_waiver('30000000-0000-4000-8000-000000000001',version_id,'{"accepted_name":"Demo Member","signature_text":"Demo Member","date_of_birth":"1990-01-01","age_confirmed":true,"emergency_contact_name":"Test","emergency_contact_phone":"0","consents":["I read the waiver","I accept the risks"]}'::jsonb);
    raise exception 'Duplicate acceptance was allowed';
  exception when unique_violation then null; end;
  begin
    update public.waiver_acceptances set accepted_name='Altered' where id=acceptance_id;
    raise exception 'Signer altered a signed record';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_waiver_draft('30000000-0000-4000-8000-000000000001',null,'Hijack','',true,'Bad','Bad','{"consent_items":["x"]}'::jsonb);
    raise exception 'Member managed waiver templates';
  exception when insufficient_privilege then null; end;
end; $$;

set local role service_role;
do $$ declare template_id uuid; second_id uuid; first_id uuid; guest_acceptance uuid; begin
  select waiver_id,id into template_id,first_id from public.waiver_versions where title='Entry waiver v1';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  second_id:=public.save_waiver_draft('30000000-0000-4000-8000-000000000001',template_id,'Entry waiver','Test template',true,'Entry waiver v2','Exact legal text version two','{"collect_date_of_birth":false,"require_age_confirmation":true,"minimum_age":18,"collect_emergency_contact":false,"consent_items":["I accept version two"]}'::jsonb);
  perform public.publish_waiver_version('30000000-0000-4000-8000-000000000001',second_id);
  set local role service_role;
  begin
    update public.waiver_versions set content='Tampered' where id=first_id;
    raise exception 'Published waiver content was altered';
  exception when insufficient_privilege then null; end;
  guest_acceptance:=public.accept_guest_waiver('fe410a11a77993f9bae58b190c6f634b914e6e41cedbfcdc549c016de0877335',second_id,'{"accepted_name":"Demo Guest","signature_text":"Demo Guest","date_of_birth":"","age_confirmed":true,"emergency_contact_name":"","emergency_contact_phone":"","consents":["I accept version two"],"user_agent":"SQL guest test"}'::jsonb);
  if not exists(select 1 from public.waiver_acceptances where id=guest_acceptance and guest_invite_id='55000000-0000-4000-8000-000000000001') then raise exception 'Guest token acceptance failed'; end if;
  if not exists(select 1 from public.waiver_versions where id=first_id and status='superseded' and content='Exact legal text version one') then raise exception 'Superseded exact version was not preserved'; end if;
end; $$;

rollback;
