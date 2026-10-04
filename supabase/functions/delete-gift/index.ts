// Soft-delete a gift when the caller presents the manage_token.
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase) 

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: { giftId?: string; manageToken?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const giftId = (body.giftId || '').trim()
  const manageToken = (body.manageToken || '').trim()
  if (!giftId || !manageToken) {
    return json({ error: 'giftId and manageToken required' }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    return json({ error: 'Server not configured' }, 500)
  }

  const sb = createClient(url, key)
  const { data, error } = await sb
    .from('gifts')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', giftId)
    .eq('manage_token', manageToken)
    .select('id')

  if (error) {
    console.error('[delete-gift]', error)
    return json({ error: error.message }, 500)
  }

  return json({ ok: Boolean(data?.length) })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
