-- Artspace — agendamento público. Rode no SQL Editor depois do schema.sql.

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
