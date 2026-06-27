grant usage on schema public to service_role;

grant select, insert, update on table public.profiles to service_role;
grant select on table public.guesthouses to service_role;
grant select on table public.job_posts to service_role;
