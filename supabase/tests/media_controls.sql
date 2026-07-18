-- Prompt 33: strict paths, quotas, private access and abuse reporting.
begin;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
select public.upsert_stripe_billing_customer('30000000-0000-4000-8000-000000000001','cus_MediaGym123','media@crux.example.invalid');select public.apply_stripe_subscription_event('evt_MediaEvent123','customer.subscription.created',false,'cus_MediaGym123','sub_MediaSubscription123','price_MediaPrice123','active',now(),now()+interval'30 days',false,null,null,'starter');
update public.feature_entitlements set limit_value=(select count(*)+1 from storage.objects where bucket_id in('gym-branding','wall-images','route-media','event-images','community-images','ascent-media')and split_part(name,'/',1)='30000000-0000-4000-8000-000000000001'and name not like'%/thumbnails/%')where gym_id='30000000-0000-4000-8000-000000000001'and feature_key='media_uploads';
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
insert into storage.objects(bucket_id,name,owner_id,metadata)values('community-images','30000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000001.webp',auth.uid()::text,'{"mimetype":"image/webp"}');
insert into storage.objects(bucket_id,name,owner_id,metadata)values('community-images','30000000-0000-4000-8000-000000000001/thumbnails/91000000-0000-4000-8000-000000000001.webp',auth.uid()::text,'{"mimetype":"image/webp"}');
do $$begin
  begin insert into storage.objects(bucket_id,name,owner_id)values('community-images','30000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000002.webp',auth.uid()::text);raise exception'Media quota was bypassed';exception when check_violation then null;end;
  begin insert into storage.objects(bucket_id,name,owner_id)values('community-images','../cross-tenant.svg',auth.uid()::text);raise exception'Invalid media path was accepted';exception when invalid_parameter_value then null;end;
end$$;
insert into public.media_assets(id,gym_id,owner_profile_id,bucket_id,storage_path,thumbnail_path,purpose,mime_type,byte_size,width,height)values('92000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',auth.uid(),'community-images','30000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000001.webp','30000000-0000-4000-8000-000000000001/thumbnails/91000000-0000-4000-8000-000000000001.webp','post','image/webp',100,100,100);
select public.report_media_asset('30000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Potentially abusive image');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);do $$begin if exists(select 1 from storage.objects where bucket_id='community-images'and name like'30000000-0000-4000-8000-000000000001/%')then raise exception'Non-member accessed private media';end if;end$$;
rollback;
