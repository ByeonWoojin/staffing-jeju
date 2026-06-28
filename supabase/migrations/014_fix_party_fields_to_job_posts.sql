alter table public.guesthouses
drop column if exists party_type;

drop type if exists public.party_type;

alter table public.job_posts
add column if not exists has_party boolean not null default false,
add column if not exists party_description text;

grant select, update on table public.guesthouses to service_role;
grant select, update on table public.job_posts to service_role;
