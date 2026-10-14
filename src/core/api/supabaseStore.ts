import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { giftExpiresAt } from '../gift'
import type { FinalizePaymentInput, GiftStore, StoredGift } from './types'

interface PublicGiftRow {
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
  delivery: 'link' | 'email'
  status: StoredGift['status']
  created_at: string
  expires_at: string | null
  deleted_at: string | null
}

function publicRowToGift(row: PublicGiftRow): StoredGift {
  const createdAt = new Date(row.created_at).getTime()
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
    voicePath: null,
    senderEmail: '',
    recipientEmail: '',
    delivery: row.delivery,
    paymentId: '',
    paymentProvider: '',
    manageToken: '',
    status: row.status,
    createdAt,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : giftExpiresAt(createdAt),
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

function functionsBase() {
  return (
    (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  )
}

/**
 * Browser client for public gift reads + token RPCs.
 * Paid writes go through create-checkout / creem-webhook (service role).
 */
export function createSupabaseStore(): GiftStore {
  const sb = client()

  async function callFunction<T>(name: string, body: unknown): Promise<T> {
    const res = await fetch(`${functionsBase()}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
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

    async finalizePaidGift(_input: FinalizePaymentInput): Promise<StoredGift> {
      // Live Creem path never reaches here (redirect + webhook).
      // Direct anon inserts are disabled — refuse instead of opening a free-gift hole.
      throw new Error('Direct gift create is disabled. Use Creem checkout.')
    },

    async getGift(id) {
      // RPC returns at most one non-expired paid gift (no public table/view listing).
      const { data, error } = await sb.rpc('get_gift', { p_id: id })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) return null
      return publicRowToGift(row as PublicGiftRow)
    },

    async getVoiceUrl(gift) {
      if (!gift.hasVoice) return null
      try {
        const data = await callFunction<{ url?: string }>('get-voice-url', { giftId: gift.id })
        return data.url || null
      } catch (err) {
        console.warn('[supabase] get-voice-url failed', err)
        return null
      }
    },

    async reportGift(id, reason, details) {
      try {
        await callFunction('report-gift', {
          giftId: id,
          reason,
          details: details || undefined,
        })
        return
      } catch (err) {
        console.warn('[supabase] report-gift function unavailable, trying rpc', err)
      }

      const { data: rpcOk, error: rpcErr } = await sb.rpc('report_gift', {
        p_id: id,
        p_reason: reason,
        p_details: details || null,
      })
      if (rpcErr) throw rpcErr
      if (!rpcOk) throw new Error('Gift not found or already removed')
    },

    async deleteGift(id, manageToken) {
      const { data: rpcOk, error: rpcErr } = await sb.rpc('delete_gift', {
        p_id: id,
        p_token: manageToken,
      })
      if (rpcErr) throw rpcErr
      return Boolean(rpcOk)
    },
  }
}
