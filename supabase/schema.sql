-- Artspace Barbearia — rode no SQL Editor do projeto.
-- Idempotente: pode executar de novo.

create extension if not exists btree_gist;

do $$ begin
  create type public.user_role as enum ('professional', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.branch as enum ('tattoo', 'barber', 'piercing');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.appointment_status as enum (
    'scheduled',
    'confirmed',
    'present',
    'no_show',
    'rescheduled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  cpf text not null unique,
  email text not null unique,
  role public.user_role not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.professional_branches (
  professional_id uuid not null references public.profiles (id) on delete cascade,
  branch public.branch not null,
  primary key (professional_id, branch)
);

create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  branch public.branch not null,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 30,
  unique (professional_id, weekday)
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  reason text
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  cpf text not null unique,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  professional_id uuid not null references public.profiles (id),
  procedure_id uuid not null references public.procedures (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents integer not null,
  status public.appointment_status not null default 'scheduled',
  constraint appointments_range check (ends_at > starts_at)
);

alter table public.appointments drop constraint if exists appointments_client_id_fkey;
alter table public.appointments
  add constraint appointments_client_id_fkey
  foreign key (client_id) references public.clients (id);

alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('scheduled', 'confirmed', 'present'));

alter table public.profiles enable row level security;
alter table public.professional_branches enable row level security;
alter table public.procedures enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

drop policy if exists profiles_self_or_admin on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists branches_self_or_admin on public.professional_branches;
drop policy if exists procedures_self_or_admin on public.procedures;
drop policy if exists rules_self_or_admin on public.availability_rules;
drop policy if exists blocks_self_or_admin on public.availability_blocks;
drop policy if exists appointments_self_or_admin on public.appointments;
drop policy if exists clients_staff on public.clients;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy branches_self_or_admin on public.professional_branches
  for all to authenticated
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create policy procedures_self_or_admin on public.procedures
  for all to authenticated
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create policy rules_self_or_admin on public.availability_rules
  for all to authenticated
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create policy blocks_self_or_admin on public.availability_blocks
  for all to authenticated
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create policy clients_staff on public.clients
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

create policy appointments_self_or_admin on public.appointments
  for all to authenticated
  using (professional_id = auth.uid() or public.is_admin())
  with check (professional_id = auth.uid() or public.is_admin());

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount_cents integer not null check (amount_cents > 0),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists expenses_admin on public.expenses;
create policy expenses_admin on public.expenses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

drop policy if exists profile_media_public_read on storage.objects;
create policy profile_media_public_read on storage.objects
  for select to public
  using (bucket_id = 'profile-media');

drop policy if exists profile_media_own_insert on storage.objects;
create policy profile_media_own_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_media_own_update on storage.objects;
create policy profile_media_own_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_media_own_delete on storage.objects;
create policy profile_media_own_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.clients
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null;

create index if not exists clients_auth_user_id_idx on public.clients (auth_user_id);

drop policy if exists clients_self_select on public.clients;
create policy clients_self_select on public.clients
  for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists appointments_client_select on public.appointments;
create policy appointments_client_select on public.appointments
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists appointments_client_insert on public.appointments;
create policy appointments_client_insert on public.appointments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists appointments_client_delete on public.appointments;
create policy appointments_client_delete on public.appointments
  for delete to authenticated
  using (
    status in ('scheduled', 'confirmed')
    and starts_at > now()
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.auth_user_id = auth.uid()
    )
  );

alter table public.availability_blocks
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.availability_blocks
  drop constraint if exists availability_blocks_professional_id_date_key;
