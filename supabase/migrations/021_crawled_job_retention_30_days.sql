-- Retain crawled external job posts for 30 days after their latest post/bump.
-- Older rows are purged daily by Supabase Cron.

create index if not exists crawled_job_posts_posted_at_idx
  on public.crawled_job_posts (posted_at);

create or replace function public.purge_expired_crawled_job_posts()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.crawled_job_posts
  where posted_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_crawled_job_posts() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-expired-crawled-job-posts';

select cron.schedule(
  'purge-expired-crawled-job-posts',
  '0 18 * * *', -- Every day at 03:00 Korea Standard Time (18:00 UTC)
  'select public.purge_expired_crawled_job_posts();'
);

-- Apply the policy immediately to any rows that have already expired.
select public.purge_expired_crawled_job_posts();
