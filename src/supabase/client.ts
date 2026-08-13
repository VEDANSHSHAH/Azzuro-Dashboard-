import { createClient } from '@supabase/supabase-js'
import {
  deleteNativeSecret,
  getNativeSecret,
  isNativeApp,
  setNativeSecret,
} from '../native'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
const sessionStorageKey = 'mywork-azzuro.supabase.session'

export const isSupabaseConfigured =
  /^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl) &&
  supabasePublishableKey.startsWith('sb_publishable_')

const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isNativeApp()) return getNativeSecret(`auth:${key}`)

    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isNativeApp()) {
      await setNativeSecret(`auth:${key}`, value)
      return
    }

    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Browser preview has no secure native credential store.
    }
  },
  async removeItem(key: string): Promise<void> {
    if (isNativeApp()) {
      await deleteNativeSecret(`auth:${key}`)
      return
    }

    try {
      window.localStorage.removeItem(key)
    } catch {
      // Browser preview has no secure native credential store.
    }
  },
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: sessionStorage,
        storageKey: sessionStorageKey,
      },
    })
  : null
