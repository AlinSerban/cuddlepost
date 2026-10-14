-- Harden gifts / voices / reports for production.
-- Paid checkout stays on Edge Functions + service_role (create-checkout, creem-webhook).
-- Anon may only: read safe public gift fields, execute delete/report RPCs.

-- ---------------------------------------------------------------------------
-- 1) Drop temporary open write policies
-- ---------------------------------------------------------------------------
drop policy if exists "Temp anon insert gifts" on public.gifts;
drop policy if exists "Temp anon update gifts by manage token" on public.gifts;
drop policy if exists "Temp anon insert reports" on public.gift_reports;

drop policy if exists "Temp anon upload voices" on storage.objects;
drop policy if exists "Temp anon update voices" on storage.objects;
drop policy if exists "Temp anon read voices" on storage.objects;

-- ---------------------------------------------------------------------------
-- 2) Public read via safe view (no emails, manage_token, payment ids)
-- ---------------------------------------------------------------------------
drop policy if exists "Public read paid gifts" on public.gifts;

revoke all on table public.gifts from anon, authenticated;
revoke all on table public.gift_reports from anon, authenticated;

grant all on table public.gifts to service_role;
grant all on table public.gift_reports to service_role;

create or replace view public.gifts_public
with (security_invoker = false)
as
select
  id,
  brand,
  plush,
  color,
  patch_color,
  patches,
  sender_name,
  recipient_name,
  message,
  occasion,
  has_voice,
  delivery,
  status,
  created_at,
  expires_at,
  deleted_at
from public.gifts
where status = 'paid'
  and deleted_at is null;

grant select on public.gifts_public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) RPCs stay available to anon (token-checked / report flow)
-- ---------------------------------------------------------------------------
grant execute on function public.delete_gift(text, text) to anon, authenticated, service_role;
grant execute on function public.report_gift(text, text, text) to anon, authenticated, service_role;
