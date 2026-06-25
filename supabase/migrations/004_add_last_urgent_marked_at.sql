alter table public.job_posts
  add column if not exists last_urgent_marked_at timestamptz null;
