-- Optional: tighten anon policies. Production Creem path uses Edge Functions + service role
-- (create-checkout inserts pending_payment; creem-webhook updates to paid).
-- Run this only if you still want anon able to insert/update during stub/dev.

drop policy if exists "Temp anon insert gifts" on public.gifts;
create policy "Temp anon insert gifts"
  on public.gifts for insert
  to anon, authenticated
  with check (
    brand = 'cuddlepost'
    and status in ('pending_payment', 'paid')
  );

drop policy if exists "Temp anon update gifts by manage token" on public.gifts;
create policy "Temp anon update gifts by manage token"
  on public.gifts for update
  to anon, authenticated
  using (manage_token is not null)
  with check (
    status in ('pending_payment', 'paid', 'reported', 'deleted')
  );
