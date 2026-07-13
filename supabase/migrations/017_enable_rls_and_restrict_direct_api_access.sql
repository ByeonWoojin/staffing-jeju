-- Restrict direct PostgREST access to application tables.
-- The app currently performs table reads/writes through server-only code that
-- verifies the logged-in user and then uses the service_role client.

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.guesthouses from anon, authenticated;
revoke all on table public.job_posts from anon, authenticated;
revoke all on table public.applications from anon, authenticated;
revoke all on table public.application_status_logs from anon, authenticated;
revoke all on table public.job_post_update_logs from anon, authenticated;
revoke all on table public.admin_logs from anon, authenticated;
revoke all on table public.guesthouse_photos from anon, authenticated;
revoke all on table public.job_post_photos from anon, authenticated;
revoke all on table public.staff_favorite_guesthouses from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.guesthouses enable row level security;
alter table public.job_posts enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_logs enable row level security;
alter table public.job_post_update_logs enable row level security;
alter table public.admin_logs enable row level security;
alter table public.guesthouse_photos enable row level security;
alter table public.job_post_photos enable row level security;
alter table public.staff_favorite_guesthouses enable row level security;
