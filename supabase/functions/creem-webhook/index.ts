// Creem webhook: verify signature, mark gift paid, send emails.
// Secrets: CREEM_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM (optional), SITE_URL
// Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// verify_jwt = false (Creem does not send a Supabase JWT)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex.length !== signature.length) return false
  let ok = 0
  for (let i = 0; i < hex.length; i++) ok |= hex.charCodeAt(i) ^ signature.charCodeAt(i)
  return ok === 0
}

async function sendResend(to: string, subject: string, body: string, kind: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[creem-webhook] RESEND_API_KEY missing, skip email', kind)
    return
  }
  const from = (Deno.env.get('EMAIL_FROM') || 'post@cuddlepost.fun').trim()
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
      text: body,
    }),
  })
  if (!res.ok) {
    console.error('[creem-webhook] resend', res.status, await res.text().catch(() => ''))
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const secret = Deno.env.get('CREEM_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const siteUrl = (Deno.env.get('SITE_URL') || 'https://cuddlepost.fun').replace(/\/$/, '')

  if (!secret) return json({ error: 'Webhook secret not configured' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase not configured' }, 500)

  const rawBody = await req.text()
  const signature = req.headers.get('creem-signature')
  if (!(await verifySignature(rawBody, signature, secret))) {
    return json({ error: 'Invalid signature' }, 401)
  }

  let event: {
    eventType?: string
    object?: {
      id?: string
      request_id?: string
      metadata?: { giftId?: string }
      order?: { id?: string }
      status?: string
    }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (event.eventType !== 'checkout.completed') {
    return json({ ok: true, ignored: event.eventType || null })
  }

  const checkout = event.object || {}
  const giftId = checkout.metadata?.giftId || checkout.request_id
  if (!giftId) return json({ error: 'Missing gift id' }, 400)

  const sb = createClient(supabaseUrl, serviceKey)
  const { data: gift, error: findErr } = await sb
    .from('gifts')
    .select(
      'id,status,sender_name,recipient_name,sender_email,recipient_email,delivery,manage_token,payment_id',
    )
    .eq('id', giftId)
    .maybeSingle()

  if (findErr) {
    console.error('[creem-webhook] find', findErr)
    return json({ error: 'Lookup failed' }, 502)
  }
  if (!gift) return json({ error: 'Gift not found' }, 404)

  if (gift.status === 'paid') return json({ ok: true, alreadyPaid: true })
  if (gift.status !== 'pending_payment') {
    return json({ error: 'Unexpected gift status', status: gift.status }, 409)
  }

  const paymentId = checkout.order?.id || checkout.id || gift.payment_id
  const { data: updated, error: upErr } = await sb
    .from('gifts')
    .update({
      status: 'paid',
      payment_id: paymentId,
      payment_provider: 'creem',
    })
    .eq('id', giftId)
    .eq('status', 'pending_payment')
    .select('id')

  if (upErr) {
    console.error('[creem-webhook] update', upErr)
    return json({ error: 'Update failed' }, 502)
  }
  if (!updated?.length) return json({ ok: true, alreadyPaid: true })

  const giftUrl = `${siteUrl}/gift/${giftId}`
  const manageUrl = `${siteUrl}/manage/${giftId}?token=${encodeURIComponent(gift.manage_token)}`

  await sendResend(
    gift.sender_email,
    `Your Cuddlepost receipt · gift for ${gift.recipient_name}`,
    [
      `Thanks for sending a Cuddlepost.`,
      ``,
      `To: ${gift.recipient_name}`,
      `Open / share: ${giftUrl}`,
      `Manage / delete: ${manageUrl}`,
      ``,
      `This gift link stays open for 3 days.`,
    ].join('\n'),
    'receipt',
  )

  if (gift.delivery === 'email' && gift.recipient_email) {
    await sendResend(
      gift.recipient_email,
      `${gift.sender_name} sent you a Cuddlepost`,
      [
        `Hi ${gift.recipient_name},`,
        ``,
        `${gift.sender_name} sent you a Cuddlepost.`,
        `Open your gift: ${giftUrl}`,
        ``,
        `This link stays open for 3 days.`,
      ].join('\n'),
      'gift',
    )
  }

  return json({ ok: true })
})
