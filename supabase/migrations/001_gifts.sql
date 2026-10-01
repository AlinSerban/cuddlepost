-- Plushie Gift schema for Supabase (Cloudflare Pages frontends call this).
-- Run in the Supabase SQL editor when you create the project.

create extension if not exists "pgcrypto";

create table if not exists public.gifts (
  id text primary key,
  brand text not null check (brand = 'cuddlepost'),
  plush text not null,
  color text not null,
  patch_color text not null,
  patches jsonb not null default '{}'::jsonb,
  sender_name text not null,
  recipient_name text not null,
  message text not null,
  occasion text not null,
  has_voice boolean not null default false,
  voice_path text,
  sender_email text not null,
  recipient_email text,
  delivery text not null default 'link',
  payment_id text,
  payment_provider text not null default 'stub',
  manage_token text not null,
  status text not null default 'paid'
    check (status in ('pending_payment', 'paid', 'reported', 'deleted')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  deleted_at timestamptz
);

create index if not exists gifts_brand_created_idx on public.gifts (brand, created_at desc);
create index if not exists gifts_status_idx on public.gifts (status);

create table if not exists public.gift_reports (
  id uuid primary key default gen_random_uuid(),
  gift_id text not null references public.gifts (id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.gifts enable row level security;
alter table public.gift_reports enable row level security;

-- Grants (needed because "Automatically expose new tables" was disabled)
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.gifts to anon, authenticated;
grant select, insert on table public.gift_reports to anon, authenticated;

drop policy if exists "Public read paid gifts" on public.gifts;
create policy "Public read paid gifts"
  on public.gifts for select
  to anon, authenticated
  using (status = 'paid' and deleted_at is null);

-- TEMPORARY: allow client-side stub checkout until Edge Functions (finalize-gift) exist.
-- Replace with service-role-only writes once Polar webhook + finalize-gift are live.
drop policy if exists "Temp anon insert gifts" on public.gifts;
create policy "Temp anon insert gifts"
  on public.gifts for insert
  to anon, authenticated
  with check (brand = 'cuddlepost');

drop policy if exists "Temp anon update gifts by manage token" on public.gifts;
create policy "Temp anon update gifts by manage token"
  on public.gifts for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Temp anon insert reports" on public.gift_reports;
create policy "Temp anon insert reports"
  on public.gift_reports for insert
  to anon, authenticated
  with check (true);

insert into storage.buckets (id, name, public)
values ('gift-voices', 'gift-voices', false)
on conflict (id) do nothing;

-- Voice uploads from the browser (temporary until finalize-gift Edge Function)
drop policy if exists "Temp anon upload voices" on storage.objects;
create policy "Temp anon upload voices"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'gift-voices');

drop policy if exists "Temp anon update voices" on storage.objects;
create policy "Temp anon update voices"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'gift-voices');

drop policy if exists "Temp anon read voices" on storage.objects;
create policy "Temp anon read voices"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gift-voices');
