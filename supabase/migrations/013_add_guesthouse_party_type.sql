do $$
begin
  create type public.party_type as enum ('none', 'occasional', 'regular');
exception
  when duplicate_object then null;
end $$;

alter table public.guesthouses
add column if not exists party_type public.party_type not null default 'none';

grant select on table public.profiles to service_role;
grant select, update on table public.guesthouses to service_role;
