create table if not exists public.staff_favorite_guesthouses (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  guesthouse_id uuid not null references public.guesthouses(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint staff_favorite_guesthouses_staff_guesthouse_key unique (staff_id, guesthouse_id)
);

create index if not exists staff_favorite_guesthouses_staff_id_idx
  on public.staff_favorite_guesthouses(staff_id);

create index if not exists staff_favorite_guesthouses_guesthouse_id_idx
  on public.staff_favorite_guesthouses(guesthouse_id);

grant usage on schema public to service_role;

grant select on table public.profiles to service_role;
grant select on table public.guesthouses to service_role;
grant select on table public.job_posts to service_role;
grant select on table public.guesthouse_photos to service_role;
grant select on table public.job_post_photos to service_role;
grant select, insert, delete on table public.staff_favorite_guesthouses to service_role;
