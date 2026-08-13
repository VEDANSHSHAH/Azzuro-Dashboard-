import { createEmptyAppData, normalizeAppData } from '../data/defaults'
import { loadWorkspaceData } from '../data/storage'
import type { AppData, LinkEntry } from '../domain'
import {
  deleteNativeSecret,
  getNativeSecret,
  isNativeApp,
  loadNativeState,
  setNativeSecret,
} from '../native'
import { supabase } from './client'

interface WorkspaceRow {
  state: unknown
  revision: number
}
export interface CloudWorkspace {
  data: AppData
  revision: number
}

type CloudLink = Omit<LinkEntry, 'password'>
type CloudAppData = Omit<AppData, 'links'> & { links: CloudLink[] }

function withoutPlaintextPasswords(data: AppData): CloudAppData {
  return {
    ...data,
    links: data.links.map(({ password: _password, ...link }) => link),
  }
}

async function hydrateLinkPasswords(data: AppData): Promise<AppData> {
  if (!isNativeApp()) return data

  const links = await Promise.all(
    data.links.map(async (link) => ({
      ...link,
      password: (await getNativeSecret(link.id)) ?? '',
    })),
  )

  return { ...data, links }
}

export async function loadCloudWorkspace(): Promise<CloudWorkspace | null> {
  if (!supabase) throw new Error('Supabase is not configured for this build.')

  const { data, error } = await supabase
    .from('workspaces')
    .select('state, revision')
    .maybeSingle<WorkspaceRow>()

  if (error) throw error
  if (!data) return null

  return {
    data: await hydrateLinkPasswords(normalizeAppData(data.state)),
    revision: data.revision,
  }
}

export async function saveCloudWorkspace(
  data: AppData,
  expectedRevision: number | null,
): Promise<CloudWorkspace> {
  if (!supabase) throw new Error('Supabase is not configured for this build.')

  const { data: saved, error } = await supabase.rpc('save_workspace', {
    next_state: withoutPlaintextPasswords(data),
    expected_revision: expectedRevision,
  })

  if (error) throw error

  const row = Array.isArray(saved) ? saved[0] : saved
  if (!row || typeof row !== 'object') {
    throw new Error('Supabase did not return the saved workspace.')
  }

  const record = row as WorkspaceRow
  return {
    data,
    revision: record.revision,
  }
}

export async function saveLinkSecrets(
  links: readonly LinkEntry[],
  previousIds: ReadonlySet<string>,
): Promise<Set<string>> {
  if (!isNativeApp()) return new Set(links.map((link) => link.id))

  const currentIds = new Set(links.map((link) => link.id))
  const removedIds = [...previousIds].filter((id) => !currentIds.has(id))

  await Promise.all([
    ...removedIds.map((id) => deleteNativeSecret(id)),
    ...links.map((link) =>
      link.password
        ? setNativeSecret(link.id, link.password)
        : deleteNativeSecret(link.id),
    ),
  ])

  return currentIds
}

export async function loadLegacyWorkspace(): Promise<AppData> {
  if (!isNativeApp()) return loadWorkspaceData()

  const legacyState = await loadNativeState()
  if (!legacyState) return createEmptyAppData()

  return hydrateLinkPasswords(normalizeAppData(legacyState))
}
