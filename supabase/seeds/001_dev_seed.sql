-- Development seed data for Supabase SQL Editor.
--
-- Before running this file:
-- 1. Create/sign in two users in Supabase Auth.
-- 2. Replace the two UUID values below with real auth.users.id values.
-- 3. Do not insert rows into auth.users manually.
--
-- Replace:
-- - owner_id: aa76a2fb-747b-4a36-bd98-6797043fed8e
-- - staff_id: 5aa6e9b6-63c8-44c8-89d7-1469320387b2
--
-- This seed intentionally does not create RLS policies or Storage buckets/policies.

begin;

create temp table _dev_seed_vars (
  owner_id uuid not null,
  staff_id uuid not null
) on commit drop;

create temp table _dev_seed_refs (
  guesthouse_id uuid not null default '11111111-1111-4111-8111-111111111111',
  job_post_id uuid not null default '22222222-2222-4222-8222-222222222222',
  application_id uuid not null default '33333333-3333-4333-8333-333333333333'
) on commit drop;

insert into _dev_seed_refs default values;

insert into _dev_seed_vars (owner_id, staff_id)
values (
  'aa76a2fb-747b-4a36-bd98-6797043fed8e',
  '5aa6e9b6-63c8-44c8-89d7-1469320387b2'
);

do $$
declare
  seed_owner_id uuid;
  seed_staff_id uuid;
begin
  select owner_id, staff_id
    into seed_owner_id, seed_staff_id
  from _dev_seed_vars;

  if seed_owner_id = '00000000-0000-0000-0000-000000000001'::uuid
    or seed_staff_id = '00000000-0000-0000-0000-000000000002'::uuid then
    raise exception 'Replace owner_id and staff_id at the top of this seed with real Supabase Auth user ids.';
  end if;

  if seed_owner_id = seed_staff_id then
    raise exception 'owner_id and staff_id must be different Auth user ids.';
  end if;
end;
$$;

insert into public.profiles (
  id,
  role,
  name,
  phone,
  email,
  created_at,
  updated_at
)
select
  owner_id,
  'owner'::public.user_role,
  '김사장',
  '010-1234-5678',
  'owner@example.com',
  '2026-06-20 09:00:00+09'::timestamptz,
  '2026-06-20 09:00:00+09'::timestamptz
from _dev_seed_vars
union all
select
  staff_id,
  'staff'::public.user_role,
  '이지은',
  '010-2345-6789',
  'staff@example.com',
  '2026-06-20 10:00:00+09'::timestamptz,
  '2026-06-20 10:00:00+09'::timestamptz
from _dev_seed_vars
on conflict (id) do update
set
  role = excluded.role,
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  updated_at = excluded.updated_at;

with upserted_guesthouse as (
  insert into public.guesthouses (
    id,
    owner_id,
    name,
    region,
    address_text,
    map_url,
    contact_method,
    created_at,
    updated_at
  )
  select
    refs.guesthouse_id,
    vars.owner_id,
    '제주 바람 게스트하우스',
    '제주시 애월',
    '제주특별자치도 제주시 애월읍 곽지해안로 20',
    'https://map.naver.com/p/example',
    '카카오톡 @jeju-baram / 010-1234-5678',
    '2026-06-01 10:00:00+09'::timestamptz,
    '2026-06-15 14:30:00+09'::timestamptz
  from _dev_seed_vars vars
  cross join _dev_seed_refs refs
  on conflict (owner_id) do update
  set
    name = excluded.name,
    region = excluded.region,
    address_text = excluded.address_text,
    map_url = excluded.map_url,
    contact_method = excluded.contact_method,
    updated_at = excluded.updated_at
  returning id
)
update _dev_seed_refs
set guesthouse_id = (select id from upserted_guesthouse);

with upserted_job_post as (
  insert into public.job_posts (
    id,
    guesthouse_id,
    slug,
    title,
    recruit_count,
    gender_condition,
    age_condition,
    work_start_date,
    min_work_period,
    work_content,
    work_time,
    work_days_per_week,
    off_days_per_week,
    stipend_type,
    stipend_description,
    provides_accommodation,
    provides_meal,
    is_urgent,
    preferred_conditions,
    caution,
    extra_info,
    description,
    status,
    recruitment_cycle,
    bumped_at,
    last_bumped_at,
    bump_count,
    created_at,
    updated_at
  )
  select
    job_post_id,
    guesthouse_id,
    'jeju-baram-staff-2026-summer',
    '여름 시즌 프론트·하우스키핑 스탭 모집',
    2,
    'any'::public.gender_condition,
    '20대~30대',
    '2026-07-01',
    '1개월 이상',
    '프론트 데스크 운영, 체크인/체크아웃 안내, 공용 공간 청소, 세탁물 관리',
    '09:00 ~ 18:00 (점심 1시간)',
    5,
    2,
    'provided'::public.stipend_type,
    '월 80만원 + 식사 제공',
    true,
    true,
    true,
    '게스트하우스 근무 경험자 우대',
    '주말 근무 포함, 성수기에는 교대 근무 가능',
    '입도 후 3일간 오리엔테이션 진행',
    '제주 애월 바다가 보이는 게스트하우스에서 함께할 스탭을 모집합니다.',
    'open'::public.job_status,
    1,
    '2026-06-18 08:00:00+09'::timestamptz,
    '2026-06-18 10:00:00+09'::timestamptz,
    2,
    '2026-06-10 09:00:00+09'::timestamptz,
    '2026-06-19 10:00:00+09'::timestamptz
  from _dev_seed_refs
  on conflict (guesthouse_id) do update
  set
    slug = excluded.slug,
    title = excluded.title,
    recruit_count = excluded.recruit_count,
    gender_condition = excluded.gender_condition,
    age_condition = excluded.age_condition,
    work_start_date = excluded.work_start_date,
    min_work_period = excluded.min_work_period,
    work_content = excluded.work_content,
    work_time = excluded.work_time,
    work_days_per_week = excluded.work_days_per_week,
    off_days_per_week = excluded.off_days_per_week,
    stipend_type = excluded.stipend_type,
    stipend_description = excluded.stipend_description,
    provides_accommodation = excluded.provides_accommodation,
    provides_meal = excluded.provides_meal,
    is_urgent = excluded.is_urgent,
    preferred_conditions = excluded.preferred_conditions,
    caution = excluded.caution,
    extra_info = excluded.extra_info,
    description = excluded.description,
    status = excluded.status,
    recruitment_cycle = excluded.recruitment_cycle,
    bumped_at = excluded.bumped_at,
    last_bumped_at = excluded.last_bumped_at,
    bump_count = excluded.bump_count,
    updated_at = excluded.updated_at
  returning id
)
update _dev_seed_refs
set job_post_id = (select id from upserted_job_post);

with upserted_application as (
  insert into public.applications (
    id,
    job_post_id,
    staff_id,
    recruitment_cycle,
    name,
    age,
    gender,
    phone,
    representative_photo_path,
    available_start_date,
    available_work_period,
    experience_status,
    introduction,
    status,
    created_at,
    updated_at
  )
  select
    refs.application_id,
    refs.job_post_id,
    vars.staff_id,
    1,
    '이지은',
    26,
    'female'::public.gender_condition,
    '010-2345-6789',
    'applications/staff-001/profile.jpg',
    '2026-07-05',
    '2개월',
    'experienced'::public.experience_status,
    '제주 게스트하우스에서 3개월 근무 경험이 있습니다. 프론트와 하우스키핑 모두 가능합니다.',
    'submitted'::public.application_status,
    '2026-06-19 14:20:00+09'::timestamptz,
    '2026-06-19 14:20:00+09'::timestamptz
  from _dev_seed_vars vars
  cross join _dev_seed_refs refs
  on conflict (job_post_id, staff_id, recruitment_cycle) do update
  set
    name = excluded.name,
    age = excluded.age,
    gender = excluded.gender,
    phone = excluded.phone,
    representative_photo_path = excluded.representative_photo_path,
    available_start_date = excluded.available_start_date,
    available_work_period = excluded.available_work_period,
    experience_status = excluded.experience_status,
    introduction = excluded.introduction,
    status = excluded.status,
    updated_at = excluded.updated_at
  returning id
)
update _dev_seed_refs
set application_id = (select id from upserted_application);

insert into public.application_status_logs (
  id,
  application_id,
  changed_by,
  from_status,
  to_status,
  memo,
  created_at,
  updated_at
)
select
  '44444444-4444-4444-8444-444444444444'::uuid,
  refs.application_id,
  vars.staff_id,
  null,
  'submitted'::public.application_status,
  '개발용 seed: 지원서 최초 제출 로그',
  '2026-06-19 14:20:00+09'::timestamptz,
  '2026-06-19 14:20:00+09'::timestamptz
from _dev_seed_vars vars
cross join _dev_seed_refs refs
on conflict (id) do update
set
  application_id = excluded.application_id,
  changed_by = excluded.changed_by,
  from_status = excluded.from_status,
  to_status = excluded.to_status,
  memo = excluded.memo,
  updated_at = excluded.updated_at;

insert into public.job_post_update_logs (
  id,
  job_post_id,
  changed_by,
  field_name,
  old_value,
  new_value,
  created_at,
  updated_at
)
select
  '55555555-5555-4555-8555-555555555555'::uuid,
  refs.job_post_id,
  vars.owner_id,
  'stipend_description',
  '월 70만원 + 식사 제공',
  '월 80만원 + 식사 제공',
  '2026-06-19 10:00:00+09'::timestamptz,
  '2026-06-19 10:00:00+09'::timestamptz
from _dev_seed_vars vars
cross join _dev_seed_refs refs
on conflict (id) do update
set
  job_post_id = excluded.job_post_id,
  changed_by = excluded.changed_by,
  field_name = excluded.field_name,
  old_value = excluded.old_value,
  new_value = excluded.new_value,
  updated_at = excluded.updated_at;

commit;
