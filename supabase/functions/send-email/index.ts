// Supabase Edge Function: send transactional mail via Resend.
// Secrets: RESEND_API_KEY, optional EMAIL_FROM (defaults to post@cuddlepost.fun)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return json({ error: 'Email not configured' }, 500)
  }

  let payload: {
    to?: string
    subject?: string
    body?: string
    from?: string
    kind?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const to = (payload.to || '').trim()
  const subject = (payload.subject || '').trim()
  const text = (payload.body || '').trim()
  const from =
    (Deno.env.get('EMAIL_FROM') || payload.from || 'post@cuddlepost.fun').trim()

  if (!EMAIL_RE.test(to) || !subject || !text) {
    return json({ error: 'Missing to, subject, or body' }, 400)
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Cuddlepost <${from}>`,
      to: [to],
      subject,
      text,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('resend error', res.status, data)
    return json({ error: 'Resend failed', details: data }, 502)
  }

  return json({ ok: true, id: data.id, kind: payload.kind || null })
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}
