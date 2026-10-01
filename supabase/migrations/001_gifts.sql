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

-- Public can only read paid, non-deleted gifts (no emails / manage_token).
alter table public.gifts enable row level security;
alter table public.gift_reports enable row level security;

create policy "Public read paid gifts"
  on public.gifts for select
  using (status = 'paid' and deleted_at is null);

-- Inserts/updates go through Edge Functions with the service role key.
-- Voice files live in Storage bucket `gift-voices` (private; signed URLs from functions).

insert into storage.buckets (id, name, public)
values ('gift-voices', 'gift-voices', false)
on conflict (id) do nothing;
