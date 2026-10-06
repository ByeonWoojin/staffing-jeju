-- 수집 글의 어필 포인트(복지, 숙소·위치, 하루 일과, 분위기 등)를 요약해 담는다.
-- intro: 한두 문장 소개 / highlights: [{ "title": "복지·혜택", "items": ["...", "..."] }, ...]
alter table public.crawled_job_posts
  add column if not exists intro text,
  add column if not exists highlights jsonb not null default '[]'::jsonb;
