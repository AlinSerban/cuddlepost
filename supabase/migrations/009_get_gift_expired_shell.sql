-- Return a minimal shell for expired paid gifts so the UI can show
-- "This parcel has expired" instead of "went astray".
-- Live (non-expired) gifts still get full public fields. Message/voice stay hidden when expired.

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
    case when g.expires_at > now() then g.patches else '{}'::jsonb end,
    case when g.expires_at > now() then g.sender_name else '' end,
    case when g.expires_at > now() then g.recipient_name else '' end,
    case when g.expires_at > now() then g.message else '' end,
    case when g.expires_at > now() then g.occasion else 'Just because' end,
    case when g.expires_at > now() then g.has_voice else false end,
    g.delivery,
    g.status,
    g.created_at,
    g.expires_at,
    g.deleted_at
  from public.gifts g
  where g.id = p_id
    and g.status = 'paid'
    and g.deleted_at is null;
$$;

revoke all on function public.get_gift(text) from public;
grant execute on function public.get_gift(text) to anon, authenticated, service_role;
