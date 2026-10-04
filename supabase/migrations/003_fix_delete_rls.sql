-- Soft-delete was failing with 42501 ("new row violates row-level security")
-- because production WITH CHECK did not allow status = 'deleted' (or differed
-- from 001_gifts.sql). Paste this in the Supabase SQL editor and Run.

drop policy if exists "Temp anon update gifts by manage token" on public.gifts;

create policy "Temp anon update gifts by manage token"
  on public.gifts for update
  to anon, authenticated
  using (manage_token is not null)
  with check (
    status in ('pending_payment', 'paid', 'reported', 'deleted')
  );
