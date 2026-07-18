-- Prompt 33: central media inventory, upload quotas, abuse reports and strict tenant paths.
update public.platform_plans set features=jsonb_set(features,'{media_uploads}',case plan_key when'starter'then'{"enabled":true,"limit":500}'::jsonb when'growth'then'{"enabled":true,"limit":5000}'::jsonb else'{"enabled":true,"limit":25000}'::jsonb end),updated_at=now();
update public.subscriptions set plan_key=plan_key;

create table public.media_assets(
  id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id)on delete restrict,owner_profile_id uuid not null references public.profiles(id)on delete restrict,
  bucket_id text not null check(bucket_id in('gym-branding','wall-images','route-media','event-images','community-images','ascent-media')),
  storage_path text not null,thumbnail_path text,purpose text not null check(purpose in('logo','wall','route','event','post','ascent')),
  target_id uuid,mime_type text not null check(mime_type in('image/webp','video/mp4')),byte_size integer not null check(byte_size>0),width integer,height integer,
  status text not null default'ready'check(status in('ready','quarantined','deleted')),retention_until timestamptz,deleted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint media_assets_storage_key unique(bucket_id,storage_path),constraint media_assets_thumbnail_key unique(bucket_id,thumbnail_path),constraint media_assets_id_gym_key unique(id,gym_id),constraint media_assets_dimensions_check check((width is null and height is null)or(width>0 and height>0))
);
create index media_assets_gym_time_idx on public.media_assets(gym_id,created_at desc);create index media_assets_retention_idx on public.media_assets(retention_until)where retention_until is not null and deleted_at is null;
create trigger media_assets_set_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
create or replace function private.protect_media_asset_identity()returns trigger language plpgsql set search_path=''as $$begin if row(old.gym_id,old.owner_profile_id,old.bucket_id,old.storage_path,old.thumbnail_path,old.purpose,old.target_id,old.mime_type,old.byte_size,old.width,old.height)is distinct from row(new.gym_id,new.owner_profile_id,new.bucket_id,new.storage_path,new.thumbnail_path,new.purpose,new.target_id,new.mime_type,new.byte_size,new.width,new.height)then raise exception'Media asset identity is immutable'using errcode='42501';end if;return new;end$$;
create trigger protect_media_asset_identity before update on public.media_assets for each row execute function private.protect_media_asset_identity();
alter table public.media_assets enable row level security;alter table public.media_assets force row level security;
create policy media_assets_select_member on public.media_assets for select to authenticated using(private.current_membership_id(gym_id)is not null);
create policy media_assets_insert_owner on public.media_assets for insert to authenticated with check(owner_profile_id=auth.uid()and private.current_membership_id(gym_id)is not null and storage_path like gym_id::text||'/%'and(thumbnail_path is null or thumbnail_path like gym_id::text||'/%'));
create policy media_assets_update_owner on public.media_assets for update to authenticated using(owner_profile_id=auth.uid()or private.has_gym_capability(gym_id,'routes.manage')or private.has_gym_capability(gym_id,'community.moderate'))with check(gym_id=media_assets.gym_id and owner_profile_id=media_assets.owner_profile_id);
revoke delete on public.media_assets from authenticated;grant select,insert,update on public.media_assets to authenticated;grant all on public.media_assets to service_role;

create table public.media_abuse_reports(id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gyms(id)on delete restrict,media_asset_id uuid not null,reporter_profile_id uuid not null references public.profiles(id)on delete restrict,reason text not null check(char_length(btrim(reason))between 3 and 1000),status text not null default'open'check(status in('open','reviewing','resolved','dismissed')),created_at timestamptz not null default now(),resolved_at timestamptz,constraint media_abuse_reports_asset_fkey foreign key(media_asset_id,gym_id)references public.media_assets(id,gym_id)on delete restrict,constraint media_abuse_reports_once unique(media_asset_id,reporter_profile_id));
create index media_abuse_reports_gym_status_idx on public.media_abuse_reports(gym_id,status,created_at desc);
alter table public.media_abuse_reports enable row level security;alter table public.media_abuse_reports force row level security;
create policy media_reports_select_own_or_moderator on public.media_abuse_reports for select to authenticated using(reporter_profile_id=auth.uid()or private.has_gym_capability(gym_id,'community.moderate'));
grant select on public.media_abuse_reports to authenticated;grant all on public.media_abuse_reports to service_role;

create or replace function private.enforce_media_storage_upload()returns trigger language plpgsql security definer set search_path=''
as $$declare target_gym_id uuid;allowed integer;used integer;original_path text;begin
  if new.bucket_id not in('gym-branding','wall-images','route-media','event-images','community-images','ascent-media')then return new;end if;
  if new.name!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)?(thumbnails/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|mp4)$'then raise exception'Invalid media storage path'using errcode='22023';end if;
  target_gym_id:=split_part(new.name,'/',1)::uuid;
  if new.name like'%/thumbnails/%'then original_path:=replace(new.name,'/thumbnails/','/');if not exists(select 1 from storage.objects where bucket_id=new.bucket_id and name=original_path)then raise exception'Thumbnail requires its source asset'using errcode='23503';end if;return new;end if;
  if not private.feature_available(target_gym_id,'media_uploads')then raise exception'Media uploads are unavailable on this gym plan'using errcode='42501';end if;
  allowed:=private.feature_limit(target_gym_id,'media_uploads');if allowed is null then return new;end if;
  select count(*)into used from storage.objects where bucket_id in('gym-branding','wall-images','route-media','event-images','community-images','ascent-media')and split_part(name,'/',1)=target_gym_id::text and name not like'%/thumbnails/%';
  if used>=allowed then raise exception'Media upload quota reached'using errcode='23514';end if;return new;
end$$;
create trigger enforce_media_storage_upload before insert on storage.objects for each row execute function private.enforce_media_storage_upload();

create or replace function public.report_media_asset(target_gym_id uuid,target_media_id uuid,report_reason text)returns uuid language plpgsql security definer set search_path=''
as $$declare report_id uuid;begin if private.current_membership_id(target_gym_id)is null or char_length(btrim(report_reason))not between 3 and 1000 or not exists(select 1 from public.media_assets where id=target_media_id and gym_id=target_gym_id and status='ready')then raise exception'Invalid media report'using errcode='22023';end if;insert into public.media_abuse_reports(gym_id,media_asset_id,reporter_profile_id,reason)values(target_gym_id,target_media_id,auth.uid(),btrim(report_reason))returning id into report_id;insert into public.audit_logs(gym_id,actor_profile_id,actor_type,action,target_type,target_id,metadata)values(target_gym_id,auth.uid(),'user','media.reported','media_asset',target_media_id,jsonb_build_object('report_id',report_id));return report_id;end$$;
revoke all on function public.report_media_asset(uuid,uuid,text)from public,anon;grant execute on function public.report_media_asset(uuid,uuid,text)to authenticated;
