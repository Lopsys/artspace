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
