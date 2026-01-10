export type FullSnapshot = {
  version: 1
  updatedAt: string // ISO
  data: {
    trackables: any[]
    completions: any[]
    groceries: any[]
  }
}

export type MinimalSnapshot = {
  version: 2
  updatedAt: string
  data: {
    trackables: Array<{ id: number; lastCompleted?: string | null; archived?: boolean }>
  }
}

export type Snapshot = FullSnapshot | MinimalSnapshot

const GIST_FILE_NAME = 'wirys-data.json'
const TOKEN_KEY = 'wirys_gist_token'
const GIST_ID_KEY = 'wirys_gist_id'

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setGistId(id: string | null) {
  if (id) localStorage.setItem(GIST_ID_KEY, id)
  else localStorage.removeItem(GIST_ID_KEY)
}

export function getGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY)
}

async function ghFetch(path: string, method = 'GET', body?: any) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json'
  }
  if (token) headers['Authorization'] = `token ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function createGist(snapshot: Snapshot, isPublic = false) {
  const body = {
    description: 'wirys app data (JSON snapshot)',
    public: isPublic,
    files: {
      [GIST_FILE_NAME]: {
        content: JSON.stringify(snapshot, null, 2)
      }
    }
  }

  const res = await ghFetch('/gists', 'POST', body)
  const id = res.id as string
  setGistId(id)
  return res
}

export async function updateGist(gistId: string, snapshot: Snapshot) {
  const body = {
    files: {
      [GIST_FILE_NAME]: {
        content: JSON.stringify(snapshot, null, 2)
      }
    }
  }

  const res = await ghFetch(`/gists/${gistId}`, 'PATCH', body)
  return res
}

export async function getGist(gistId: string) {
  const res = await ghFetch(`/gists/${gistId}`, 'GET')
  // find our file
  const file = res.files?.[GIST_FILE_NAME]
  if (!file) throw new Error('Gist missing wirys-data.json file')
  try {
    return JSON.parse(file.content)
  } catch (e) {
    throw new Error('Failed to parse gist JSON file')
  }
}

export function minimalFromFullSnapshot(snap: Snapshot): MinimalSnapshot {
  if ((snap as MinimalSnapshot).version === 2) return snap as MinimalSnapshot
  // Convert full snapshot -> minimal by finding last completion per trackable
  const full = snap as FullSnapshot
  const trackables: Array<{ id: number; lastCompleted?: string | null; archived?: boolean }> = (full.data.trackables || []).map((t: any) => ({ id: t.id, archived: !!t.archived, lastCompleted: null }))
  const completions: any[] = full.data.completions || []

  const byTrack = new Map<number, string>()
  for (const c of completions) {
    const tId = c.trackableId
    const time = c.completedAt
    if (!tId) continue
    const prev = byTrack.get(tId)
    if (!prev || new Date(time) > new Date(prev)) {
      byTrack.set(tId, new Date(time).toISOString())
    }
  }

  for (const t of trackables) {
    if (byTrack.has(t.id)) t.lastCompleted = byTrack.get(t.id)!
  }

  return {
    version: 2,
    updatedAt: full.updatedAt,
    data: { trackables }
  }
}

export async function fetchCurrentMinimalSnapshot(): Promise<MinimalSnapshot | null> {
  const id = getGistId()
  if (!id) return null
  const snap = await getGist(id)
  return minimalFromFullSnapshot(snap)
}

function minimalEqual(a: MinimalSnapshot, b: MinimalSnapshot) {
  const sort = (arr: any[]) => [...arr].sort((x, y) => (x.id - y.id))
  const A = sort(a.data.trackables)
  const B = sort(b.data.trackables)
  if (A.length !== B.length) return false
  for (let i = 0; i < A.length; i++) {
    if (A[i].id !== B[i].id) return false
    const aTime = A[i].lastCompleted || null
    const bTime = B[i].lastCompleted || null
    if (aTime !== bTime) return false
  }
  return true
}

export async function upsertCurrentMinimalGist(snapshot: MinimalSnapshot, isPublic = false) {
  const id = getGistId()
  if (!id) {
    return createGist(snapshot as Snapshot, isPublic)
  }

  // compare with current gist minimal content and skip update if unchanged
  const existing = await fetchCurrentMinimalSnapshot()
  if (existing && minimalEqual(existing, snapshot)) {
    return { message: 'unchanged' }
  }
  return updateGist(id, snapshot as Snapshot)
}

export async function fetchCurrentGistSnapshot(): Promise<Snapshot | null> {
  const id = getGistId()
  if (!id) return null
  return getGist(id)
}

export async function upsertCurrentGist(snapshot: Snapshot, isPublic = false) {
  const id = getGistId()
  if (id) return updateGist(id, snapshot)
  return createGist(snapshot, isPublic)
}

const LAST_MINIMAL_KEY = 'wirys_last_minimal_snapshot'

export function setLastSyncedMinimal(snapshot: MinimalSnapshot | null) {
  if (snapshot) localStorage.setItem(LAST_MINIMAL_KEY, JSON.stringify(snapshot))
  else localStorage.removeItem(LAST_MINIMAL_KEY)
}

export function getLastSyncedMinimal(): MinimalSnapshot | null {
  const raw = localStorage.getItem(LAST_MINIMAL_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as MinimalSnapshot } catch { return null }
}
