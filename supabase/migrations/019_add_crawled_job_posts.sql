-- 네이버 카페에서 수집한 외부 모집글. 기존 guesthouses / job_posts 와 분리된 추가 전용 테이블이다.
-- (사장님 계정 1개당 게스트하우스 1개, 게스트하우스 1개당 모집글 1개 제약과 충돌하지 않는다.)
-- 앱은 서버 코드에서 service_role 로만 읽고 쓴다(017 과 같은 정책). 지원자가 보는 값은 서버에서 로그인 여부로 걸러서 내려준다.

create table if not exists public.crawled_job_posts (
  id uuid primary key default gen_random_uuid(),

  -- 출처. 같은 글을 반복 게시(끌올)해도 source_group_id 가 같으므로 새 행이 아니라 갱신한다.
  source text not null default 'naver_cafe',
  source_group_id text not null,
  source_article_id text not null,
  source_url text not null,
  first_posted_at timestamptz not null,
  posted_at timestamptz not null,
  repost_count integer not null default 0,

  title text not null,
  guesthouse_name text,
  region text,
  address_text text,
  map_url text,

  recruit_count integer not null default 1,
  gender_condition public.gender_condition not null default 'any',
  age_condition text,
  work_start_date date not null,
  min_work_period text not null default '협의',
  work_content text,
  work_time text,
  work_days_per_week integer,
  off_days_per_week integer,
  stipend_type public.stipend_type not null default 'none',
  stipend_description text,
  provides_accommodation boolean not null default false,
  provides_meal boolean not null default false,
  has_party boolean not null default false,
  party_kind text,
  party_description text,
  is_urgent boolean not null default false,
  preferred_conditions text,
  caution text,
  description text,

  -- 지원 안내 (로그인한 사용자에게만 내려준다)
  apply_channel text not null default 'original',
  apply_url text,
  apply_phones text[] not null default '{}',
  apply_emails text[] not null default '{}',
  apply_kakao_id text,
  apply_hint text,

  tags text[] not null default '{}',
  thumbnail_path text,
  thumbnail_source_url text,

  -- 검수 메타: 사장님이 판정해야 했던 필드 / 기본값으로 가정한 필드
  review_missing text[] not null default '{}',
  review_assumed text[] not null default '{}',

  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint crawled_job_posts_source_group_key unique (source, source_group_id),
  constraint crawled_job_posts_status_check check (status in ('visible', 'hidden', 'closed')),
  constraint crawled_job_posts_recruit_count_check check (recruit_count > 0),
  constraint crawled_job_posts_work_days_check check (work_days_per_week is null or work_days_per_week between 1 and 7),
  constraint crawled_job_posts_off_days_check check (off_days_per_week is null or off_days_per_week between 0 and 6)
);

create index if not exists crawled_job_posts_status_first_posted_idx
on public.crawled_job_posts (status, first_posted_at desc);

create index if not exists crawled_job_posts_region_idx
on public.crawled_job_posts (region);

drop trigger if exists set_crawled_job_posts_updated_at on public.crawled_job_posts;
create trigger set_crawled_job_posts_updated_at
before update on public.crawled_job_posts
for each row execute function public.set_updated_at();

-- 직접 PostgREST 접근 차단 (017 과 동일): 서버 코드의 service_role 만 사용한다.
revoke all on table public.crawled_job_posts from anon, authenticated;
alter table public.crawled_job_posts enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.crawled_job_posts to service_role;
