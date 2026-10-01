-- Add 72-hour gift link expiry (run in Supabase SQL editor).

alter table public.gifts
  add column if not exists expires_at timestamptz;

update public.gifts
set expires_at = created_at + interval '72 hours'
where expires_at is null;

alter table public.gifts
  alter column expires_at set default (now() + interval '72 hours');

alter table public.gifts
  alter column expires_at set not null;
