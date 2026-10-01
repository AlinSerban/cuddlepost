import { createLocalStore } from './localStore'
import { createSupabaseStore, supabaseConfigured } from './supabaseStore'
import type { GiftStore } from './types'

export type { FinalizePaymentInput, GiftStore, StoredGift } from './types'
export { newManageToken, publicGiftView } from './types'
export { supabaseConfigured } from './supabaseStore'

let store: GiftStore | null = null

/** Local browser store until VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set. */
export function getGiftStore(): GiftStore {
  if (!store) {
    store = supabaseConfigured() ? createSupabaseStore() : createLocalStore()
  }
  return store
}

/** For tests / switching after env change. */
export function resetGiftStore() {
  store = null
}

export const MAX_VOICE_BYTES = 2 * 1024 * 1024
export const MAX_VOICE_SECONDS = 60
