with checks(migration, item, ok, detail) as (
  values
  ('001','extension pgcrypto', exists(select 1 from pg_extension where extname='pgcrypto'), 'pgcrypto extension'),
  ('001','enum user_role', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['staff','owner','admin'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='user_role'), false), 'staff/owner/admin'),
  ('001','enum job_status', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['open','closed','hidden'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='job_status'), false), 'open/closed/hidden'),
  ('001','enum application_status', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['submitted','viewed','accepted','rejected','canceled'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='application_status'), false), 'application statuses'),
  ('001','enum gender_condition', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['any','male','female'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='gender_condition'), false), 'any/male/female'),
  ('001','enum experience_status', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['none','experienced'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='experience_status'), false), 'none/experienced'),
  ('001','enum stipend_type', coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder)=array['none','provided','negotiable','custom'] from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='stipend_type'), false), 'stipend enum'),
  ('001','base tables', (select count(*)=7 from information_schema.tables where table_schema='public' and table_name in ('profiles','guesthouses','job_posts','applications','application_status_logs','job_post_update_logs','admin_logs')), '7 base tables'),
  ('001','named constraints', (select count(*)=10 from pg_constraint where connamespace='public'::regnamespace and conname in ('guesthouses_owner_id_key','job_posts_slug_key','job_posts_guesthouse_id_key','job_posts_recruit_count_check','job_posts_work_days_per_week_check','job_posts_off_days_per_week_check','job_posts_recruitment_cycle_check','job_posts_bump_count_check','applications_job_post_staff_cycle_key','applications_age_check')), 'key constraints'),
  ('001','indexes', (select count(*)=16 from pg_indexes where schemaname='public' and indexname in ('profiles_role_idx','guesthouses_owner_id_idx','guesthouses_region_idx','job_posts_owner_id_idx','job_posts_guesthouse_id_idx','job_posts_status_bumped_at_idx','job_posts_is_urgent_idx','applications_job_post_id_idx','applications_staff_id_idx','applications_status_idx','application_status_logs_application_id_idx','application_status_logs_changed_by_idx','job_post_update_logs_job_post_id_idx','job_post_update_logs_changed_by_idx','admin_logs_admin_id_idx','admin_logs_target_idx')), '001 indexes'),
  ('001','functions', to_regprocedure('public.set_updated_at()') is not null and to_regprocedure('public.set_job_post_owner_id()') is not null, 'trigger functions'),
  ('001','triggers', (select count(*)=8 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal and t.tgname in ('set_profiles_updated_at','set_guesthouses_updated_at','set_job_posts_updated_at','set_applications_updated_at','set_application_status_logs_updated_at','set_job_post_update_logs_updated_at','set_admin_logs_updated_at','set_job_post_owner_id')), '001 triggers'),
  ('002','anon/auth schema usage', has_schema_privilege('anon','public','USAGE') and has_schema_privilege('authenticated','public','USAGE'), 'public schema usage'),
  ('002','anon/auth select privileges', (select count(*)=14 from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') and lower(privilege_type)='select' and table_name in ('profiles','guesthouses','job_posts','applications','application_status_logs','job_post_update_logs','admin_logs')), '7 tables x 2 roles'),
  ('003','service_role base select', (select count(*)=7 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and lower(privilege_type)='select' and table_name in ('profiles','guesthouses','job_posts','applications','application_status_logs','job_post_update_logs','admin_logs')), 'service_role select'),
  ('003','service_role job_posts write', exists(select 1 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and table_name='job_posts' and lower(privilege_type)='update'), 'job_posts update privilege'),
  ('004','job_posts.last_urgent_marked_at', exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_posts' and column_name='last_urgent_marked_at'), 'urgent timestamp column'),
  ('005','application status privileges', (select count(*)=4 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='applications' and lower(privilege_type) in ('select','update')) or (table_name='application_status_logs' and lower(privilege_type) in ('select','insert')))), 'service_role app status privileges'),
  ('006','job update log privileges', (select count(*)=5 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='profiles' and lower(privilege_type)='select') or (table_name='job_posts' and lower(privilege_type) in ('select','update')) or (table_name='job_post_update_logs' and lower(privilege_type) in ('select','insert')))), 'service_role job log privileges'),
  ('007','guesthouse update privileges', (select count(*)=3 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='profiles' and lower(privilege_type)='select') or (table_name='guesthouses' and lower(privilege_type) in ('select','update')))), 'service_role guesthouse privileges'),
  ('008','profile auth privileges', (select count(*)=5 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='profiles' and lower(privilege_type) in ('select','insert','update')) or (table_name in ('guesthouses','job_posts') and lower(privilege_type)='select'))), 'service_role profile auth privileges'),
  ('009','owner onboarding privileges', (select count(*)=5 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='profiles' and lower(privilege_type)='select') or (table_name in ('guesthouses','job_posts') and lower(privilege_type) in ('select','insert')))), 'service_role onboarding privileges'),
  ('010','guesthouses.description', exists(select 1 from information_schema.columns where table_schema='public' and table_name='guesthouses' and column_name='description'), 'description column'),
  ('010','guesthouse_photos table', to_regclass('public.guesthouse_photos') is not null, 'guesthouse_photos'),
  ('010','guesthouse_photos indexes', (select count(*)=2 from pg_indexes where schemaname='public' and indexname in ('guesthouse_photos_guesthouse_id_idx','guesthouse_photos_owner_id_idx')), 'photo indexes'),
  ('010','guesthouse_photos trigger', exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='guesthouse_photos' and t.tgname='set_guesthouse_photos_updated_at' and not t.tgisinternal), 'updated_at trigger'),
  ('010','guesthouse-images bucket', exists(select 1 from storage.buckets where id='guesthouse-images' and name='guesthouse-images' and public is true and file_size_limit=5242880 and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]), 'public image bucket'),
  ('010','guesthouse photo privileges', (select count(*)=6 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='guesthouses' and lower(privilege_type) in ('select','update')) or (table_name='guesthouse_photos' and lower(privilege_type) in ('select','insert','update','delete')))), 'service_role photo privileges'),
  ('011','job_post_photos table', to_regclass('public.job_post_photos') is not null, 'job_post_photos'),
  ('011','job_post_photos indexes', (select count(*)=2 from pg_indexes where schemaname='public' and indexname in ('job_post_photos_job_post_id_idx','job_post_photos_owner_id_idx')), 'photo indexes'),
  ('011','job_post_photos trigger', exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='job_post_photos' and t.tgname='set_job_post_photos_updated_at' and not t.tgisinternal), 'updated_at trigger'),
  ('011','job-post-images bucket', exists(select 1 from storage.buckets where id='job-post-images' and name='job-post-images' and public is true and file_size_limit=5242880 and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]), 'public image bucket'),
  ('011','job post photo privileges', (select count(*)=5 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='job_posts' and lower(privilege_type)='select') or (table_name='job_post_photos' and lower(privilege_type) in ('select','insert','update','delete')))), 'service_role photo privileges'),
  ('013','party migration present or superseded', (to_regtype('public.party_type') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='guesthouses' and column_name='party_type')) or (to_regtype('public.party_type') is null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='guesthouses' and column_name='party_type') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_posts' and column_name='has_party')), '013 artifacts may be removed by 014'),
  ('013','party privileges', (select count(*)>=3 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name='profiles' and lower(privilege_type)='select') or (table_name='guesthouses' and lower(privilege_type) in ('select','update')))), 'service_role party privileges'),
  ('014','party_type removed', to_regtype('public.party_type') is null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='guesthouses' and column_name='party_type'), 'party type/column removed'),
  ('014','job_posts party columns', exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_posts' and column_name='has_party' and is_nullable='NO') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='job_posts' and column_name='party_description'), 'has_party/party_description'),
  ('014','party fix privileges', (select count(*)>=4 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and table_name in ('guesthouses','job_posts') and lower(privilege_type) in ('select','update')), 'service_role party fix privileges'),
  ('015','staff_favorite_guesthouses table', to_regclass('public.staff_favorite_guesthouses') is not null, 'favorites table'),
  ('015','staff favorites constraint', exists(select 1 from pg_constraint where connamespace='public'::regnamespace and conname='staff_favorite_guesthouses_staff_guesthouse_key'), 'unique staff/guesthouse'),
  ('015','staff favorites indexes', (select count(*)=2 from pg_indexes where schemaname='public' and indexname in ('staff_favorite_guesthouses_staff_id_idx','staff_favorite_guesthouses_guesthouse_id_idx')), 'favorite indexes'),
  ('015','staff favorites privileges', (select count(*)>=8 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name in ('profiles','guesthouses','job_posts','guesthouse_photos','job_post_photos') and lower(privilege_type)='select') or (table_name='staff_favorite_guesthouses' and lower(privilege_type) in ('select','insert','delete')))), 'service_role favorite privileges'),
  ('016','application-photos bucket', exists(select 1 from storage.buckets where id='application-photos' and name='application-photos' and public is false and file_size_limit=5242880 and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]), 'private application photo bucket'),
  ('016','application photo privileges', (select count(*)>=7 from information_schema.role_table_grants where table_schema='public' and grantee='service_role' and ((table_name in ('profiles','job_posts','guesthouses') and lower(privilege_type)='select') or (table_name='applications' and lower(privilege_type) in ('select','insert','update')) or (table_name='application_status_logs' and lower(privilege_type) in ('select','insert')))), 'service_role application photo privileges')
),
rollup as (
  select
    migration,
    case
      when bool_and(ok) then 'applied'
      when bool_or(ok) then 'partial'
      else 'missing'
    end as verdict,
    count(*) filter (where ok) as ok_count,
    count(*) as total_count
  from checks
  group by migration
)
select
  'summary' as row_type,
  migration,
  verdict,
  null::text as item,
  null::boolean as ok,
  ok_count::text || '/' || total_count::text as detail
from rollup
union all
select
  'check' as row_type,
  migration,
  null::text as verdict,
  item,
  ok,
  detail
from checks
order by migration, row_type desc, item;
