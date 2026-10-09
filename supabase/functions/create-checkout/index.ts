// Create a pending gift + Creem checkout session (test or live via secrets).
// Secrets: CREEM_API_KEY, CREEM_PRODUCT_ID, CREEM_API_BASE (optional), SITE_URL
// Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'

function newGiftId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

function newManageToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
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

  const creemKey = Deno.env.get('CREEM_API_KEY')
  const productId = Deno.env.get('CREEM_PRODUCT_ID')
  const creemBase = (Deno.env.get('CREEM_API_BASE') || 'https://test-api.creem.io').replace(/\/$/, '')
  const siteUrl = (Deno.env.get('SITE_URL') || 'https://cuddlepost.fun').replace(/\/$/, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!creemKey || !productId) return json({ error: 'Creem not configured' }, 500)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase not configured' }, 500)

  let body: {
    plush?: string
    color?: string
    patchColor?: string
    patches?: Record<string, string>
    senderName?: string
    recipientName?: string
    message?: string
    occasion?: string
    senderEmail?: string
    recipientEmail?: string
    delivery?: 'link' | 'email'
    voiceBase64?: string | null
    voiceContentType?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const senderEmail = (body.senderEmail || '').trim()
  const senderName = (body.senderName || '').trim()
  const recipientName = (body.recipientName || '').trim()
  const message = (body.message || '').trim()
  const delivery = body.delivery === 'email' ? 'email' : 'link'
  const recipientEmail = (body.recipientEmail || '').trim()

  if (!senderName || !recipientName || !message || !/^\S+@\S+\.\S+$/.test(senderEmail)) {
    return json({ error: 'Missing gift fields' }, 400)
  }
  if (delivery === 'email' && !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
    return json({ error: 'Missing recipient email' }, 400)
  }
  if (message.length > 1500) return json({ error: 'Message too long' }, 400)

  const giftId = newGiftId()
  const manageToken = newManageToken()
  const sb = createClient(supabaseUrl, serviceKey)

  let voicePath: string | null = null
  let hasVoice = false
  if (body.voiceBase64) {
    try {
      const raw = body.voiceBase64.includes(',') ? body.voiceBase64.split(',')[1]! : body.voiceBase64
      const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
      if (bin.byteLength > 2_100_000) return json({ error: 'Voice note too large' }, 400)
      voicePath = `cuddlepost/${giftId}.webm`
      const { error: upErr } = await sb.storage.from('gift-voices').upload(voicePath, bin, {
        contentType: body.voiceContentType || 'audio/webm',
        upsert: true,
      })
      if (upErr) {
        console.error('[create-checkout] voice upload', upErr)
        voicePath = null
      } else {
        hasVoice = true
      }
    } catch (err) {
      console.error('[create-checkout] voice decode', err)
      voicePath = null
    }
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  const row = {
    id: giftId,
    brand: 'cuddlepost',
    plush: body.plush || 'bear',
    color: body.color || '#c98b5e',
    patch_color: body.patchColor || '#e8436b',
    patches: body.patches || {},
    sender_name: senderName,
    recipient_name: recipientName,
    message,
    occasion: body.occasion || 'Just because',
    has_voice: hasVoice,
    voice_path: voicePath,
    sender_email: senderEmail,
    recipient_email: recipientEmail || null,
    delivery,
    payment_id: null as string | null,
    payment_provider: 'creem',
    manage_token: manageToken,
    status: 'pending_payment',
    expires_at: expiresAt,
  }

  const { error: insertErr } = await sb.from('gifts').insert(row)
  if (insertErr) {
    console.error('[create-checkout] insert', insertErr)
    return json({ error: 'Could not create pending gift' }, 502)
  }

  const successUrl = `${siteUrl}/sent/${giftId}?manage=${encodeURIComponent(manageToken)}${
    delivery === 'email' && recipientEmail ? `&to=${encodeURIComponent(recipientEmail)}` : ''
  }`

  const creemRes = await fetch(`${creemBase}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': creemKey,
    },
    body: JSON.stringify({
      product_id: productId,
      request_id: giftId,
      success_url: successUrl,
      customer: { email: senderEmail, name: senderName },
      metadata: { giftId, brand: 'cuddlepost' },
    }),
  })

  const creemText = await creemRes.text()
  let creemData: { id?: string; checkout_url?: string; checkoutUrl?: string } = {}
  try {
    creemData = JSON.parse(creemText)
  } catch {
    /* ignore */
  }

  if (!creemRes.ok) {
    console.error('[create-checkout] creem', creemRes.status, creemText)
    await sb
      .from('gifts')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', giftId)
    return json({ error: 'Could not create checkout' }, 502)
  }

  const checkoutUrl = creemData.checkout_url || creemData.checkoutUrl
  if (!checkoutUrl) {
    await sb
      .from('gifts')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', giftId)
    return json({ error: 'Checkout URL missing' }, 502)
  }

  if (creemData.id) {
    await sb.from('gifts').update({ payment_id: creemData.id }).eq('id', giftId)
  }

  return json({
    checkoutUrl,
    paymentId: creemData.id || giftId,
    giftId,
    manageToken,
  })
})
