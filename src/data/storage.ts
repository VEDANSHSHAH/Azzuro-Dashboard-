import type { AppData } from '../domain/models'
import { createEmptyAppData, normalizeAppData } from './defaults'

export const WORKSPACE_STORAGE_KEY = 'mywork-azzuro.workspace.v1'

export interface WorkspaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
function browserStorage(): WorkspaceStorage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadWorkspaceData(
  storage: WorkspaceStorage | null = browserStorage(),
): AppData {
  if (!storage) return createEmptyAppData()

  try {
    const stored = storage.getItem(WORKSPACE_STORAGE_KEY)
    return stored ? normalizeAppData(JSON.parse(stored) as unknown) : createEmptyAppData()
  } catch {
    return createEmptyAppData()
  }
}

export function saveWorkspaceData(
  data: AppData,
  storage: WorkspaceStorage | null = browserStorage(),
): boolean {
  if (!storage) return false

  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearWorkspaceData(
  storage: WorkspaceStorage | null = browserStorage(),
): boolean {
  if (!storage) return false

  try {
    storage.removeItem(WORKSPACE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
