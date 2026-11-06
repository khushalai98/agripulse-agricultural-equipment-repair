-- YANTRIQ Supabase profiles/auth baseline.
-- Email is canonical in auth.users. Profile role and verification fields are server-controlled.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'farmer' check (role in ('farmer', 'technician')),
  full_name text,
  phone text,
  phone_verified_at timestamptz,
  village_city text,
  district text,
  state text,
  pin_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant update (full_name, phone, village_city, district, state, pin_code, updated_at)
  on public.profiles to authenticated;

create policy "profile owner can read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profile owner can update allowed fields"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.technician_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  skills text[] not null default '{}',
  service_area text,
  available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.technician_profiles enable row level security;
grant select, insert, update on public.technician_profiles to authenticated;

create policy "technician owner can read own details"
  on public.technician_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'technician'
    )
  );

create policy "technician owner can insert own details"
  on public.technician_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'technician'
    )
  );

create policy "technician owner can update own details"
  on public.technician_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'technician'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'technician'
    )
  );

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger technician_profiles_updated_at
  before update on public.technician_profiles
  for each row execute function private.set_updated_at();

comment on table public.profiles is 'Private user profile data; email remains canonical in auth.users. Role and phone verification status are not user-editable.';
comment on column public.profiles.phone_verified_at is 'Null unless phone verification is implemented and verified by a trusted server process.';
