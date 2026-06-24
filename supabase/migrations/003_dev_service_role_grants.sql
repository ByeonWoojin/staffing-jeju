grant usage on schema public to service_role;

grant select on table public.profiles to service_role;
grant select on table public.guesthouses to service_role;
grant select on table public.job_posts to service_role;
grant select on table public.applications to service_role;
grant select on table public.application_status_logs to service_role;
grant select on table public.job_post_update_logs to service_role;
grant select on table public.admin_logs to service_role;

grant update on table public.job_posts to service_role;
