-- Prompt 32: admin isolation, privacy-minimising support and audited suspension.
begin;
set local role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$begin begin perform public.platform_list_gyms(auth.uid(),'demo',10);raise exception'Ordinary member accessed platform administration';exception when insufficient_privilege then null;end;end$$;
set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
do $$declare support jsonb;begin
  begin perform public.platform_list_gyms('10000000-0000-4000-8000-000000000004','',10);raise exception'Non-admin actor used service path';exception when insufficient_privilege then null;end;
  support:=public.platform_gym_support_view('10000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001');
  if support::text~'email|profile_id|display_name'then raise exception'Support view exposed member personal data';end if;
  perform public.add_platform_support_note('10000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Synthetic support note');
  perform public.suspend_platform_gym('10000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Security review in progress');
  if(select status from public.gyms where id='30000000-0000-4000-8000-000000000001')<>'suspended'or not exists(select 1 from public.audit_logs where gym_id='30000000-0000-4000-8000-000000000001'and action='gym.suspended')then raise exception'Suspension was not applied and audited';end if;
  perform public.restore_platform_gym('10000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Review completed');
  if(select status from public.gyms where id='30000000-0000-4000-8000-000000000001')='suspended'or not exists(select 1 from public.audit_logs where gym_id='30000000-0000-4000-8000-000000000001'and action='gym.restored')then raise exception'Restoration was not applied and audited';end if;
end$$;
rollback;
