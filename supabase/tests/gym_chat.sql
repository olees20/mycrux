-- Prompt 25 channel isolation, mutation windows, unread state, reporting and rate limits.
begin;
set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare channel_id uuid; begin
  channel_id:=public.create_chat_channel('30000000-0000-4000-8000-000000000001','Prompt 25 test','Member discussion',false);
  perform set_config('test.chat_channel',channel_id::text,true);
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ declare message_id uuid; begin
  message_id:=public.send_chat_message('30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid,'Hello gym',null);
  perform set_config('test.chat_message',message_id::text,true);
  if public.mark_channel_read('30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid) is null then raise exception 'Read marker missing'; end if;
  begin insert into public.messages(gym_id,channel_id,sender_id,body) values('30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid,auth.uid(),'Direct write'); raise exception 'Direct message insert succeeded'; exception when insufficient_privilege then null; end;
end $$;
select public.edit_chat_message('30000000-0000-4000-8000-000000000001',current_setting('test.chat_message')::uuid,'Edited hello');
select public.report_chat_message('30000000-0000-4000-8000-000000000001',current_setting('test.chat_message')::uuid,'Safety concern');
do $$ begin
  for counter in 1..7 loop perform public.send_chat_message('30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid,'Rate test '||counter,null); end loop;
  begin perform public.send_chat_message('30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid,'Ninth message',null); raise exception 'Rate limit did not apply'; exception when others then if sqlerrm='Rate limit did not apply' then raise; end if; end;
end $$;
set local role service_role;
insert into public.chat_channels(id,gym_id,created_by,name,channel_type) values('99000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Private test','partner');
insert into public.channel_members(gym_id,channel_id,profile_id) values('30000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004');
insert into public.messages(id,gym_id,channel_id,sender_id,body,created_at) values('99000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',current_setting('test.chat_channel')::uuid,'10000000-0000-4000-8000-000000000004','Old message',now()-interval '31 minutes');
set local role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from public.chat_channels where id='99000000-0000-4000-8000-000000000001') then raise exception 'Private channel leaked'; end if;
  if exists(select 1 from public.messages where channel_id='99000000-0000-4000-8000-000000000001') then raise exception 'Private messages leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  begin perform public.delete_chat_message('30000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000002'); raise exception 'Old message deleted'; exception when others then if sqlerrm='Old message deleted' then raise; end if; end;
end $$;
set local role service_role;
do $$ begin if not exists(select 1 from public.audit_logs where action='chat.message.reported' and target_id=current_setting('test.chat_message')::uuid) then raise exception 'Chat report audit missing'; end if; end $$;
rollback;
