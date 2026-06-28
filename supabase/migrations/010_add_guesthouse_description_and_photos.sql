alter table public.guesthouses
add column if not exists description text;

create table if not exists public.guesthouse_photos (
  id uuid primary key default gen_random_uuid(),
  guesthouse_id uuid not null references public.guesthouses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guesthouse_photos_guesthouse_id_idx
on public.guesthouse_photos (guesthouse_id);

create index if not exists guesthouse_photos_owner_id_idx
on public.guesthouse_photos (owner_id);

drop trigger if exists set_guesthouse_photos_updated_at on public.guesthouse_photos;
create trigger set_guesthouse_photos_updated_at
before update on public.guesthouse_photos
for each row execute function public.set_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'guesthouse-images',
  'guesthouse-images',
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
grant select, update on table public.guesthouses to service_role;
grant select, insert, update, delete on table public.guesthouse_photos to service_role;
