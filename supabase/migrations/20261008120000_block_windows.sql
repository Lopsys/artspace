alter table public.availability_blocks
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.availability_blocks
  drop constraint if exists availability_blocks_professional_id_date_key;
