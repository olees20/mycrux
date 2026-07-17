-- Prompt 25: moderated, rate-limited gym chat with Realtime-safe RLS.
create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  message_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now(),
  constraint message_reports_message_fkey foreign key (message_id, gym_id)
    references public.messages(id, gym_id) on delete cascade,
  constraint message_reports_once unique (message_id, reporter_id)
);

create index message_reports_gym_time_idx on public.message_reports(gym_id, created_at desc);
alter table public.message_reports enable row level security;
alter table public.message_reports force row level security;
create policy message_reports_select_reporter_or_staff on public.message_reports
for select to authenticated using (
  reporter_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage')
);
create policy message_reports_rpc_only on public.message_reports
for insert to authenticated with check (false);

drop policy messages_select_channel on public.messages;
create policy messages_select_channel on public.messages
for select to authenticated using (
  private.can_access_channel(channel_id, gym_id)
  and (moderation_status <> 'removed' or sender_id = auth.uid() or private.has_gym_capability(gym_id, 'chat.manage'))
);

drop policy messages_insert_self on public.messages;
drop policy messages_update_self_or_staff on public.messages;
create policy messages_rpc_insert_only on public.messages for insert to authenticated with check (false);
create policy messages_rpc_update_only on public.messages for update to authenticated using (false);

create or replace function public.create_chat_channel(target_gym_id uuid, channel_name text, channel_description text, read_only boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.has_gym_capability(target_gym_id, 'chat.manage') then raise insufficient_privilege; end if;
  channel_name := btrim(channel_name); channel_description := nullif(btrim(channel_description), '');
  if char_length(channel_name) not between 1 and 80 or coalesce(char_length(channel_description), 0) > 500 then raise exception 'Invalid channel details'; end if;
  insert into public.chat_channels(gym_id, created_by, name, description, channel_type, is_read_only)
  values(target_gym_id, auth.uid(), channel_name, channel_description, 'community', read_only) returning id into new_id;
  insert into public.channel_members(gym_id, channel_id, profile_id, membership_role)
  values(target_gym_id, new_id, auth.uid(), 'moderator') on conflict(channel_id, profile_id) do nothing;
  return new_id;
end $$;

create or replace function public.send_chat_message(target_gym_id uuid, target_channel_id uuid, message_body text, target_reply_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; channel_row public.chat_channels;
begin
  message_body := btrim(message_body);
  if char_length(message_body) not between 1 and 5000 then raise exception 'Message must be between 1 and 5000 characters'; end if;
  if not private.can_access_channel(target_channel_id, target_gym_id) then raise insufficient_privilege; end if;
  select * into channel_row from public.chat_channels where id=target_channel_id and gym_id=target_gym_id and archived_at is null;
  if channel_row.id is null then raise insufficient_privilege; end if;
  if channel_row.is_read_only and not private.has_gym_capability(target_gym_id, 'chat.manage') then raise exception 'This channel is read only'; end if;
  if exists(select 1 from public.channel_members where channel_id=target_channel_id and profile_id=auth.uid() and muted_until>now()) then raise exception 'You are temporarily muted'; end if;
  if (select count(*) from public.messages where gym_id=target_gym_id and sender_id=auth.uid() and created_at>now()-interval '1 minute') >= 8 then raise exception 'Rate limit reached. Wait before sending another message'; end if;
  if target_reply_id is not null and not exists(select 1 from public.messages where id=target_reply_id and channel_id=target_channel_id and gym_id=target_gym_id) then raise exception 'Reply target is invalid'; end if;
  insert into public.messages(gym_id, channel_id, sender_id, reply_to_id, body)
  values(target_gym_id, target_channel_id, auth.uid(), target_reply_id, message_body) returning id into new_id;
  return new_id;
end $$;

create or replace function public.edit_chat_message(target_gym_id uuid, target_message_id uuid, message_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  message_body := btrim(message_body);
  if char_length(message_body) not between 1 and 5000 then raise exception 'Message must be between 1 and 5000 characters'; end if;
  update public.messages set body=message_body, edited_at=now()
  where id=target_message_id and gym_id=target_gym_id and sender_id=auth.uid()
    and deleted_at is null and moderation_status='visible' and created_at>=now()-interval '15 minutes';
  if not found then raise exception 'Messages can only be edited by their author for 15 minutes'; end if;
  return target_message_id;
end $$;

create or replace function public.delete_chat_message(target_gym_id uuid, target_message_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  update public.messages set body='[deleted]', deleted_at=now()
  where id=target_message_id and gym_id=target_gym_id and sender_id=auth.uid()
    and deleted_at is null and created_at>=now()-interval '30 minutes';
  if not found then raise exception 'Messages can only be deleted by their author for 30 minutes'; end if;
  return target_message_id;
end $$;

create or replace function public.mark_channel_read(target_gym_id uuid, target_channel_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare marked_at timestamptz := now();
begin
  if not private.can_access_channel(target_channel_id, target_gym_id) then raise insufficient_privilege; end if;
  insert into public.channel_members(gym_id,channel_id,profile_id,last_read_at)
  values(target_gym_id,target_channel_id,auth.uid(),marked_at)
  on conflict(channel_id,profile_id) do update set last_read_at=excluded.last_read_at,left_at=null;
  return marked_at;
end $$;

create or replace function public.report_chat_message(target_gym_id uuid, target_message_id uuid, report_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare report_id uuid; target_channel uuid;
begin
  report_reason:=btrim(report_reason);
  if char_length(report_reason) not between 3 and 1000 then raise exception 'Report reason is invalid'; end if;
  select channel_id into target_channel from public.messages where id=target_message_id and gym_id=target_gym_id;
  if target_channel is null or not private.can_access_channel(target_channel,target_gym_id) then raise insufficient_privilege; end if;
  insert into public.message_reports(gym_id,message_id,reporter_id,reason)
  values(target_gym_id,target_message_id,auth.uid(),report_reason)
  on conflict(message_id,reporter_id) do update set reason=excluded.reason returning id into report_id;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','chat.message.reported','message',target_message_id,jsonb_build_object('report_id',report_id));
  return report_id;
end $$;

create or replace function public.moderate_chat_message(target_gym_id uuid, target_message_id uuid, target_status text, reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_gym_capability(target_gym_id,'chat.manage') then raise insufficient_privilege; end if;
  if target_status not in ('visible','hidden','flagged','removed') or char_length(btrim(reason)) not between 3 and 1000 then raise exception 'Invalid moderation decision'; end if;
  update public.messages set moderation_status=target_status where id=target_message_id and gym_id=target_gym_id;
  if not found then raise exception 'Message not found'; end if;
  insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)
  values(target_gym_id,auth.uid(),'user','chat.message.moderated','message',target_message_id,jsonb_build_object('status',target_status,'reason',btrim(reason)));
  return target_message_id;
end $$;

revoke all on function public.create_chat_channel(uuid,text,text,boolean), public.send_chat_message(uuid,uuid,text,uuid), public.edit_chat_message(uuid,uuid,text), public.delete_chat_message(uuid,uuid), public.mark_channel_read(uuid,uuid), public.report_chat_message(uuid,uuid,text), public.moderate_chat_message(uuid,uuid,text,text) from public, anon;
grant execute on function public.create_chat_channel(uuid,text,text,boolean), public.send_chat_message(uuid,uuid,text,uuid), public.edit_chat_message(uuid,uuid,text), public.delete_chat_message(uuid,uuid), public.mark_channel_read(uuid,uuid), public.report_chat_message(uuid,uuid,text), public.moderate_chat_message(uuid,uuid,text,text) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_channels') then alter publication supabase_realtime add table public.chat_channels; end if;
  end if;
end $$;
