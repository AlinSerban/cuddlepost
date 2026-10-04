-- Open Supabase → SQL Editor → paste all → Run
-- Makes Report actually save + hide the gift.

-- Allow inserting reports (production WITH CHECK was blocking)
drop policy if exists "Temp anon insert reports" on public.gift_reports;
create policy "Temp anon insert reports"
  on public.gift_reports for insert
  to anon, authenticated
  with check (true);

-- One-shot report: insert row + mark gift reported (hidden from public read)
create or replace function public.report_gift(p_id text, p_reason text, p_details text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_id is null or p_id = '' or p_reason is null or trim(p_reason) = '' then
    return false;
  end if;

  update public.gifts
  set status = 'reported'
  where id = p_id
    and status = 'paid'
    and deleted_at is null;

  get diagnostics n = row_count;

  insert into public.gift_reports (gift_id, reason, details)
  values (p_id, trim(p_reason), nullif(trim(p_details), ''));

  return n > 0;
end;
$$;

revoke all on function public.report_gift(text, text, text) from public;
grant execute on function public.report_gift(text, text, text) to anon, authenticated;
