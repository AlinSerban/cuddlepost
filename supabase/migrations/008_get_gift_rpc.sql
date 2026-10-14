-- One gift by id for anon (no full-table listing). Enforce expiry server-side.

create or replace function public.get_gift(p_id text)
returns table (
  id text,
  brand text,
  plush text,
  color text,
  patch_color text,
  patches jsonb,
  sender_name text,
  recipient_name text,
  message text,
  occasion text,
  has_voice boolean,
  delivery text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.id,
    g.brand,
    g.plush,
    g.color,
    g.patch_color,
    g.patches,
    g.sender_name,
    g.recipient_name,
    g.message,
    g.occasion,
    g.has_voice,
    g.delivery,
    g.status,
    g.created_at,
    g.expires_at,
    g.deleted_at
  from public.gifts g
  where g.id = p_id
    and g.status = 'paid'
    and g.deleted_at is null
    and g.expires_at > now();
$$;

revoke all on function public.get_gift(text) from public;
grant execute on function public.get_gift(text) to anon, authenticated, service_role;

-- Keep the view for ops/service use, but filter expiry and stop anon listing.
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
  and deleted_at is null
  and expires_at > now();

revoke all on public.gifts_public from anon, authenticated;
grant select on public.gifts_public to service_role;
