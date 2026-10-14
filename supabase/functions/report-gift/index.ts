// Report a gift (RPC) and notify support. Anon JWT ok; DB + Resend use service role / secrets.

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
  const siteUrl = (Deno.env.get('SITE_URL') || 'https://cuddlepost.fun').replace(/\/$/, '')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase not configured' }, 500)

  let body: { giftId?: string; reason?: string; details?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const giftId = (body.giftId || '').trim()
  const reason = (body.reason || '').trim()
  const details = (body.details || '').trim()
  if (!giftId || !reason) return json({ error: 'Missing giftId or reason' }, 400)

  const sb = createClient(supabaseUrl, serviceKey)
  const { data: ok, error } = await sb.rpc('report_gift', {
    p_id: giftId,
    p_reason: reason,
    p_details: details || null,
  })
  if (error) {
    console.error('[report-gift] rpc', error)
    return json({ error: 'Report failed' }, 500)
  }
  if (!ok) return json({ error: 'Gift not found or already removed' }, 404)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    const from = (Deno.env.get('EMAIL_FROM') || 'post@cuddlepost.fun').trim()
    const text = [
      'A gift was reported on Cuddlepost.',
      '',
      `Gift id: ${giftId}`,
      `Reason: ${reason}`,
      details ? `Details: ${details}` : '',
      `Open (if still visible): ${siteUrl}/gift/${giftId}`,
    ]
      .filter(Boolean)
      .join('\n')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Cuddlepost <${from}>`,
        to: ['post@cuddlepost.fun'],
        subject: `Gift reported · ${giftId}`,
        text,
      }),
    })
    if (!res.ok) console.error('[report-gift] resend', res.status, await res.text().catch(() => ''))
  }

  return json({ ok: true })
})
