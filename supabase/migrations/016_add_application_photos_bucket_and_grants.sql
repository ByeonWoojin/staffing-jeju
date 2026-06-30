insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'application-photos',
  'application-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant usage on schema public to service_role;

grant select on table public.profiles to service_role;
grant select on table public.job_posts to service_role;
grant select on table public.guesthouses to service_role;
grant select, insert, update on table public.applications to service_role;
grant select, insert on table public.application_status_logs to service_role;
