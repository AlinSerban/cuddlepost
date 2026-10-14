// Return a short-lived signed URL for a paid gift's voice note.
// Browser calls with anon JWT; signing uses service role (no public storage read).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase not configured' }, 500)

  let body: { giftId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const giftId = (body.giftId || '').trim()
  if (!giftId) return json({ error: 'Missing giftId' }, 400)

  const sb = createClient(supabaseUrl, serviceKey)
  const { data: gift, error } = await sb
    .from('gifts')
    .select('id,status,deleted_at,has_voice,voice_path')
    .eq('id', giftId)
    .maybeSingle()

  if (error) return json({ error: 'Lookup failed' }, 500)
  if (!gift || gift.status !== 'paid' || gift.deleted_at || !gift.has_voice || !gift.voice_path) {
    return json({ error: 'Voice not available' }, 404)
  }

  const { data: signed, error: signErr } = await sb.storage
    .from('gift-voices')
    .createSignedUrl(gift.voice_path, 3600)

  if (signErr || !signed?.signedUrl) {
    console.error('[get-voice-url] sign failed', signErr)
    return json({ error: 'Could not sign voice url' }, 500)
  }

  return json({ url: signed.signedUrl })
})
