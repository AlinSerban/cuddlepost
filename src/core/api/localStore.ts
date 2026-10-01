import { draftToGift, giftExpiresAt, newGiftId, type GiftDraft } from '../gift'
import type { FinalizePaymentInput, GiftStore, StoredGift } from './types'
import { newManageToken } from './types'

const GIFTS_KEY = 'pg-local-gifts-v1'
const VOICE_PREFIX = 'pg-local-voice:'

type Row = StoredGift

function readAll(): Record<string, Row> {
  try {
    return JSON.parse(localStorage.getItem(GIFTS_KEY) || '{}') as Record<string, Row>
  } catch {
    return {}
  }
}

function writeAll(rows: Record<string, Row>) {
  localStorage.setItem(GIFTS_KEY, JSON.stringify(rows))
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Browser-only store for local/dev until Supabase is configured.
 * Recipients only see the gift if they open the link in a browser that shares
 * this origin's localStorage (same machine) — swap to Supabase for real delivery.
 */
export function createLocalStore(): GiftStore {
  return {
    mode: 'local',

    async finalizePaidGift({ brand, draft, paymentId, paymentProvider }: FinalizePaymentInput) {
      const id = newGiftId()
      const base = draftToGift(draft, id, brand)
      let voicePath: string | null = null
      let hasVoice = false
      if (draft.voice) {
        try {
          const dataUrl = await blobToDataUrl(draft.voice)
          localStorage.setItem(VOICE_PREFIX + id, dataUrl)
          voicePath = VOICE_PREFIX + id
          hasVoice = true
        } catch {
          hasVoice = false
        }
      }
      const row: StoredGift = {
        ...base,
        hasVoice,
        voicePath,
        senderEmail: draft.senderEmail.trim(),
        recipientEmail: draft.recipientEmail.trim(),
        delivery: draft.delivery,
        paymentId,
        paymentProvider,
        manageToken: newManageToken(),
        status: 'paid',
        expiresAt: base.expiresAt || giftExpiresAt(base.createdAt),
      }
      const all = readAll()
      all[id] = row
      writeAll(all)
      return row
    },

    async getGift(id) {
      const row = readAll()[id]
      if (!row || row.status === 'deleted') return null
      return row
    },

    async getVoiceUrl(gift) {
      if (!gift.hasVoice) return null
      return localStorage.getItem(VOICE_PREFIX + gift.id)
    },

    async reportGift(id, reason, details) {
      const all = readAll()
      const row = all[id]
      if (!row) throw new Error('Gift not found')
      row.status = 'reported'
      all[id] = row
      writeAll(all)
      const reports = JSON.parse(localStorage.getItem('pg-local-reports') || '[]') as unknown[]
      reports.push({ id, giftId: id, reason, details, at: Date.now() })
      localStorage.setItem('pg-local-reports', JSON.stringify(reports))
      console.info('[local] gift reported', id, reason)
    },

    async deleteGift(id, manageToken) {
      const all = readAll()
      const row = all[id]
      if (!row || row.manageToken !== manageToken) return false
      row.status = 'deleted'
      all[id] = row
      writeAll(all)
      localStorage.removeItem(VOICE_PREFIX + id)
      return true
    },
  }
}

export function peekLocalDraftVoice(_draft: GiftDraft) {
  return null
}
