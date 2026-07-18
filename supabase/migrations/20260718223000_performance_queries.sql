-- Prompt 42: bounded core feeds, supporting indexes, and set-based chat unread counts.
create index if not exists notifications_profile_feed_idx on public.notifications(gym_id,profile_id,created_at desc) where archived_at is null;
create index if not exists community_posts_gym_pinned_feed_idx on public.community_posts(gym_id,is_pinned desc,created_at desc);
create index if not exists ascent_logs_profile_feed_idx on public.ascent_logs(gym_id,profile_id,session_date desc,created_at desc) where deleted_at is null;
create index if not exists events_published_window_idx on public.events(gym_id,starts_at) where status='published';

create or replace function public.get_chat_channel_summaries(target_gym_id uuid)
returns table(id uuid,name text,description text,channel_type text,is_read_only boolean,created_at timestamptz,unread bigint)
language sql security definer stable set search_path='' as $$
  select channel.id,channel.name,channel.description,channel.channel_type,channel.is_read_only,channel.created_at,
    count(message.id) filter(where message.created_at>coalesce(member.last_read_at,'-infinity'::timestamptz) and message.moderation_status<>'removed') as unread
  from public.chat_channels channel
  left join public.channel_members member on member.channel_id=channel.id and member.gym_id=channel.gym_id and member.profile_id=auth.uid()
  left join public.messages message on message.channel_id=channel.id and message.gym_id=channel.gym_id
  where channel.gym_id=target_gym_id and channel.archived_at is null
    and private.current_membership_id(target_gym_id) is not null
    and (channel.channel_type<>'partner' or member.profile_id=auth.uid())
  group by channel.id,member.last_read_at
  order by channel.created_at
$$;
revoke all on function public.get_chat_channel_summaries(uuid) from public,anon;
grant execute on function public.get_chat_channel_summaries(uuid) to authenticated,service_role;
