-- Edge Functions use the service_role key. Migration 001 only granted anon/authenticated,
-- so inserts from create-checkout failed with "permission denied for table gifts".

grant usage on schema public to service_role;
grant all on table public.gifts to service_role;
grant all on table public.gift_reports to service_role;

grant execute on function public.delete_gift(text, text) to service_role;
grant execute on function public.report_gift(text, text, text) to service_role;
