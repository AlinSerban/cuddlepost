import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { draftToGift, newGiftId } from '../gift'
import type { FinalizePaymentInput, GiftStore, StoredGift } from './types'
import { newManageToken } from './types'

interface GiftRow {
  id: string
  brand: StoredGift['brand']
  plush: StoredGift['plush']
  color: string
  patch_color: string
  patches: StoredGift['patches']
  sender_name: string
  recipient_name: string
  message: string
  occasion: string
  has_voice: boolean
  voice_path: string | null
  sender_email: string
  recipient_email: string | null
  delivery: 'link' | 'email'
  payment_id: string | null
  payment_provider: string
  manage_token: string
  status: StoredGift['status']
  created_at: string
  deleted_at: string | null
}

function rowToGift(row: GiftRow): StoredGift {
  return {
    id: row.id,
    brand: row.brand,
    plush: row.plush,
    color: row.color,
    patchColor: row.patch_color,
    patches: row.patches || {},
    senderName: row.sender_name,
    recipientName: row.recipient_name,
    message: row.message,
    occasion: row.occasion,
    hasVoice: row.has_voice,
    voicePath: row.voice_path,
    senderEmail: row.sender_email,
    recipientEmail: row.recipient_email || '',
    delivery: row.delivery,
    paymentId: row.payment_id || '',
    paymentProvider: row.payment_provider,
    manageToken: row.manage_token,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function supabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

function client(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return createClient(url, key)
}

/**
 * Browser client for reading gifts. Writes (finalize, voice upload, delete with token)
 * should go through Edge Functions with the service role once you deploy them.
 * Until then, this store uses the anon key with a temporary insert policy OR
 * falls back if the function URL is set.
 */
export function createSupabaseStore(): GiftStore {
  const fnBase = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) || ''
  const sb = client()

  async function callFunction<T>(name: string, body: unknown): Promise<T> {
    const url = `${fnBase || import.meta.env.VITE_SUPABASE_URL + '/functions/v1'}/${name}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Function ${name} failed`)
    }
    return res.json() as Promise<T>
  }

  return {
    mode: 'supabase',

    async finalizePaidGift(input: FinalizePaymentInput) {
      // Prefer Edge Function (service role + storage). Dev fallback: direct insert if RLS allows.
      if (fnBase || import.meta.env.VITE_SUPABASE_URL) {
        try {
          const voiceBase64 = input.draft.voice ? await blobToBase64(input.draft.voice) : null
          return await callFunction<StoredGift>('finalize-gift', {
            ...input,
            draft: { ...input.draft, voice: undefined },
            voiceBase64,
            voiceContentType: input.draft.voice?.type || 'audio/webm',
          })
        } catch (err) {
          console.warn('[supabase] finalize-gift function unavailable, trying direct insert', err)
        }
      }

      const id = newGiftId()
      const gift = draftToGift(input.draft, id, input.brand)
      const manageToken = newManageToken()
      let voicePath: string | null = null
      let hasVoice = false

      if (input.draft.voice) {
        voicePath = `${input.brand}/${id}.webm`
        const { error: upErr } = await sb.storage.from('gift-voices').upload(voicePath, input.draft.voice, {
          contentType: input.draft.voice.type || 'audio/webm',
          upsert: true,
        })
        if (!upErr) hasVoice = true
        else {
          console.warn('[supabase] voice upload failed', upErr)
          voicePath = null
        }
      }

      const row = {
        id,
        brand: input.brand,
        plush: gift.plush,
        color: gift.color,
        patch_color: gift.patchColor,
        patches: gift.patches,
        sender_name: gift.senderName,
        recipient_name: gift.recipientName,
        message: gift.message,
        occasion: gift.occasion,
        has_voice: hasVoice,
        voice_path: voicePath,
        sender_email: input.draft.senderEmail.trim(),
        recipient_email: input.draft.recipientEmail.trim() || null,
        delivery: input.draft.delivery,
        payment_id: input.paymentId,
        payment_provider: input.paymentProvider,
        manage_token: manageToken,
        status: 'paid' as const,
      }

      const { data, error } = await sb.from('gifts').insert(row).select('*').single()
      if (error) throw error
      return rowToGift(data as GiftRow)
    },

    async getGift(id) {
      // Omit manage_token / emails from public reads (token only via receipt / ?manage=)
      const { data, error } = await sb
        .from('gifts')
        .select(
          'id,brand,plush,color,patch_color,patches,sender_name,recipient_name,message,occasion,has_voice,voice_path,delivery,payment_id,payment_provider,status,created_at,deleted_at',
        )
        .eq('id', id)
        .eq('status', 'paid')
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return rowToGift({
        ...(data as Omit<GiftRow, 'manage_token' | 'sender_email' | 'recipient_email'>),
        manage_token: '',
        sender_email: '',
        recipient_email: null,
      })
    },

    async getVoiceUrl(gift) {
      if (!gift.voicePath) return null
      const { data, error } = await sb.storage.from('gift-voices').createSignedUrl(gift.voicePath, 3600)
      if (error) {
        console.warn('[supabase] signed voice url failed', error)
        return null
      }
      return data.signedUrl
    },

    async reportGift(id, reason, details) {
      try {
        await callFunction('report-gift', { giftId: id, reason, details })
        return
      } catch {
        const { error } = await sb.from('gift_reports').insert({ gift_id: id, reason, details: details || null })
        if (error) throw error
      }
    },

    async deleteGift(id, manageToken) {
      try {
        const res = await callFunction<{ ok: boolean }>('delete-gift', { giftId: id, manageToken })
        return res.ok
      } catch {
        const { data, error } = await sb
          .from('gifts')
          .update({ status: 'deleted', deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('manage_token', manageToken)
          .select('id')
        if (error) throw error
        return Boolean(data?.length)
      }
    },
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}
