create extension if not exists pgcrypto;

create type public.user_role as enum ('staff', 'owner', 'admin');
create type public.job_status as enum ('open', 'closed', 'hidden');
create type public.application_status as enum ('submitted', 'viewed', 'accepted', 'rejected', 'canceled');
create type public.gender_condition as enum ('any', 'male', 'female');
create type public.experience_status as enum ('none', 'experienced');
create type public.stipend_type as enum ('none', 'provided', 'negotiable', 'custom');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guesthouses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  region text not null,
  address_text text not null,
  map_url text,
  contact_method text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guesthouses_owner_id_key unique (owner_id)
);

create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  guesthouse_id uuid not null references public.guesthouses (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null,
  recruit_count integer not null,
  gender_condition public.gender_condition not null,
  age_condition text,
  work_start_date date not null,
  min_work_period text not null,
  work_content text not null,
  work_time text not null,
  work_days_per_week integer not null,
  off_days_per_week integer not null,
  stipend_type public.stipend_type not null,
  stipend_description text,
  provides_accommodation boolean not null default false,
  provides_meal boolean not null default false,
  is_urgent boolean not null default false,
  preferred_conditions text,
  caution text,
  extra_info text,
  description text,
  status public.job_status not null default 'open',
  recruitment_cycle integer not null default 1,
  bumped_at timestamptz default now(),
  last_bumped_at timestamptz,
  bump_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_posts_slug_key unique (slug),
  constraint job_posts_guesthouse_id_key unique (guesthouse_id),
  constraint job_posts_recruit_count_check check (recruit_count > 0),
  constraint job_posts_work_days_per_week_check check (work_days_per_week between 1 and 7),
  constraint job_posts_off_days_per_week_check check (off_days_per_week between 0 and 6),
  constraint job_posts_recruitment_cycle_check check (recruitment_cycle > 0),
  constraint job_posts_bump_count_check check (bump_count >= 0)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  recruitment_cycle integer not null,
  name text not null,
  age integer not null,
  gender public.gender_condition not null,
  phone text not null,
  representative_photo_path text not null,
  available_start_date date not null,
  available_work_period text not null,
  experience_status public.experience_status not null,
  introduction text not null,
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_job_post_staff_cycle_key unique (job_post_id, staff_id, recruitment_cycle),
  constraint applications_recruitment_cycle_check check (recruitment_cycle > 0),
  constraint applications_gender_check check (gender <> 'any'),
  constraint applications_age_check check (age > 0)
);

create table public.application_status_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  changed_by uuid not null references public.profiles (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_post_update_logs (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id) on delete cascade,
  changed_by uuid not null references public.profiles (id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_table text not null,
  target_id uuid,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index guesthouses_owner_id_idx on public.guesthouses (owner_id);
create index guesthouses_region_idx on public.guesthouses (region);
create index job_posts_owner_id_idx on public.job_posts (owner_id);
create index job_posts_guesthouse_id_idx on public.job_posts (guesthouse_id);
create index job_posts_status_bumped_at_idx on public.job_posts (status, bumped_at desc);
create index job_posts_is_urgent_idx on public.job_posts (is_urgent);
create index applications_job_post_id_idx on public.applications (job_post_id);
create index applications_staff_id_idx on public.applications (staff_id);
create index applications_status_idx on public.applications (status);
create index application_status_logs_application_id_idx on public.application_status_logs (application_id);
create index application_status_logs_changed_by_idx on public.application_status_logs (changed_by);
create index job_post_update_logs_job_post_id_idx on public.job_post_update_logs (job_post_id);
create index job_post_update_logs_changed_by_idx on public.job_post_update_logs (changed_by);
create index admin_logs_admin_id_idx on public.admin_logs (admin_id);
create index admin_logs_target_idx on public.admin_logs (target_table, target_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_guesthouses_updated_at
before update on public.guesthouses
for each row execute function public.set_updated_at();

create trigger set_job_posts_updated_at
before update on public.job_posts
for each row execute function public.set_updated_at();

create trigger set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_application_status_logs_updated_at
before update on public.application_status_logs
for each row execute function public.set_updated_at();

create trigger set_job_post_update_logs_updated_at
before update on public.job_post_update_logs
for each row execute function public.set_updated_at();

create trigger set_admin_logs_updated_at
before update on public.admin_logs
for each row execute function public.set_updated_at();

create or replace function public.set_job_post_owner_id()
returns trigger
language plpgsql
as $$
declare
  guesthouse_owner_id uuid;
begin
  select owner_id
    into guesthouse_owner_id
  from public.guesthouses
  where id = new.guesthouse_id;

  if guesthouse_owner_id is null then
    raise exception 'guesthouse_id % does not exist', new.guesthouse_id;
  end if;

  new.owner_id = guesthouse_owner_id;
  return new;
end;
$$;

create trigger set_job_post_owner_id
before insert or update of guesthouse_id, owner_id on public.job_posts
for each row execute function public.set_job_post_owner_id();
