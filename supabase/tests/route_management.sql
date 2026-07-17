-- Prompt 12 wall image versioning, route workflow, history, and permission tests.
begin;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

insert into public.walls(id, gym_id, name, description, sort_order)
values('61000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001','Prompt 12 sector','Versioning test',12);

insert into storage.objects(bucket_id,name,owner_id,metadata) values
('wall-images','30000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000001.png',auth.uid()::text,'{"mimetype":"image/png"}'),
('wall-images','30000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000002.png',auth.uid()::text,'{"mimetype":"image/png"}');

select public.attach_wall_image('30000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000001.png','First wall image',1200,800,now());
select public.attach_wall_image('30000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001/61000000-0000-4000-8000-000000000002.png','Second wall image',1200,800,now());

do $$
begin
  if (select count(*) from public.wall_images where wall_id='61000000-0000-4000-8000-000000000012') <> 2 then raise exception 'Wall image history was not preserved'; end if;
  if (select count(*) from public.wall_images where wall_id='61000000-0000-4000-8000-000000000012' and is_current and archived_at is null) <> 1 then raise exception 'Current wall image is ambiguous'; end if;
  begin
    insert into public.routes(id,gym_id,wall_id,colour,grade,overlay)
    values('62000000-0000-4000-8000-000000000099','30000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000012','Red','6A','{"kind":"point","x":1.2,"y":0.5}'::jsonb);
    raise exception 'Out-of-bounds overlay was accepted';
  exception when check_violation then null; end;
end;
$$;

insert into public.routes(id,gym_id,wall_id,wall_image_id,name,colour,grade_system,grade,route_type,status,setter_id,set_on,overlay,published_at)
select '62000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000012',id,'History line','Purple','font','6B','boulder','draft',auth.uid(),current_date,'{"kind":"polygon","points":[{"x":0.1,"y":0.2},{"x":0.4,"y":0.1},{"x":0.3,"y":0.7}]}'::jsonb,null
from public.wall_images where wall_id='61000000-0000-4000-8000-000000000012' and is_current and archived_at is null;

select public.publish_routes('30000000-0000-4000-8000-000000000001',array['62000000-0000-4000-8000-000000000012']::uuid[]);
insert into public.ascent_logs(id,gym_id,route_id,profile_id,ascent_type)
values('63000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000003','flash');
select public.retire_routes('30000000-0000-4000-8000-000000000001',array['62000000-0000-4000-8000-000000000012']::uuid[]);

do $$
begin
  if not exists(select 1 from public.routes where id='62000000-0000-4000-8000-000000000012' and status='retired' and retired_at is not null) then raise exception 'Route was not retired'; end if;
  if not exists(select 1 from public.ascent_logs where id='63000000-0000-4000-8000-000000000012') then raise exception 'Retirement destroyed ascent history'; end if;
  begin
    delete from public.routes where id='62000000-0000-4000-8000-000000000012';
    raise exception 'Route setter hard-deleted a route';
  exception when insufficient_privilege then null; end;
  begin
    perform public.update_gym_configuration('30000000-0000-4000-8000-000000000001','Hijacked','demo-crux-centre','Europe/London','GB','1 Test','','Leeds','LS1','x@example.invalid','',array['bouldering'],'Always',true,'#17211B','#D9FF45','#F7F7F2','No');
    raise exception 'Route setter changed unrelated gym settings';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
do $$ begin
  begin
    perform public.publish_routes('30000000-0000-4000-8000-000000000001',array['62000000-0000-4000-8000-000000000012']::uuid[]);
    raise exception 'Member published routes';
  exception when insufficient_privilege then null; end;
end; $$;

set local role service_role;
do $$ begin
  if not exists(select 1 from public.audit_logs where action='wall.image.attached')
    or not exists(select 1 from public.audit_logs where action='routes.published')
    or not exists(select 1 from public.audit_logs where action='routes.retired') then raise exception 'Route workflow audit is incomplete'; end if;
end; $$;

rollback;
