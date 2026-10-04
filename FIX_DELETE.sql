-- Open Supabase Dashboard → your project → SQL Editor → New query
-- Paste EVERYTHING below → click Run
-- You should see "Success. No rows returned" (or similar). That is OK.

create or replace function public.delete_gift(p_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_id is null or p_id = '' or p_token is null or p_token = '' then
    return false;
  end if;

  update public.gifts
  set status = 'deleted',
      deleted_at = now()
  where id = p_id
    and manage_token = p_token
    and deleted_at is null;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.delete_gift(text, text) from public;
grant execute on function public.delete_gift(text, text) to anon, authenticated;

drop policy if exists "Temp anon update gifts by manage token" on public.gifts;

create policy "Temp anon update gifts by manage token"
  on public.gifts for update
  to anon, authenticated
  using (manage_token is not null)
  with check (
    status in ('pending_payment', 'paid', 'reported', 'deleted')
  );
