create table if not exists public.job_post_photos (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_post_photos_job_post_id_idx
on public.job_post_photos (job_post_id);

create index if not exists job_post_photos_owner_id_idx
on public.job_post_photos (owner_id);

drop trigger if exists set_job_post_photos_updated_at on public.job_post_photos;
create trigger set_job_post_photos_updated_at
before update on public.job_post_photos
for each row execute function public.set_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-post-images',
  'job-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant usage on schema public to service_role;
grant select on table public.job_posts to service_role;
grant select, insert, update, delete on table public.job_post_photos to service_role;
