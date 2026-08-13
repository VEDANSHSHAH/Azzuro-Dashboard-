import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
export const isNativeApp = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export async function loadNativeState(): Promise<Record<string, unknown> | null> {
  if (!isNativeApp()) return null
  return invoke<Record<string, unknown> | null>('load_state')
}

export async function setNativeSecret(secretId: string, secret: string): Promise<void> {
  if (!isNativeApp()) return
  await invoke('set_secret', { secretId, secret })
}

export async function getNativeSecret(secretId: string): Promise<string | null> {
  if (!isNativeApp()) return null
  return invoke<string | null>('get_secret', { secretId })
}

export async function deleteNativeSecret(secretId: string): Promise<void> {
  if (!isNativeApp()) return
  await invoke('delete_secret', { secretId })
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isNativeApp()) {
    await openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
