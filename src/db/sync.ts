import { db } from '@/db'
import type { Snapshot, MinimalSnapshot } from '@/services/gistStorage'
import { getLastCompletion, deleteTrackable } from '@/db'
import { fetchCurrentGistSnapshot, upsertCurrentGist, minimalFromFullSnapshot, fetchCurrentMinimalSnapshot } from '@/services/gistStorage'
import { getLastSyncedMinimal, setLastSyncedMinimal } from '@/services/gistStorage'

export async function exportSnapshot(): Promise<Snapshot> {
  const [trackables, completions, groceries] = await Promise.all([
    db.trackables.toArray(),
    db.completions.toArray(),
    db.groceries.toArray()
  ])

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    data: {
      trackables,
      completions,
      groceries
    }
  }
}

export async function importSnapshot(snapshot: Snapshot) {
  const { trackables = [], completions = [], groceries = [] } = snapshot.data || {}

  // Use transaction to replace existing data atomically
  await db.transaction('rw', [db.trackables, db.completions, db.groceries], async () => {
    await Promise.all([
      db.trackables.clear(),
      db.completions.clear(),
      db.groceries.clear()
    ])

    // bulkPut respects provided ids when present
    if (trackables.length) await db.trackables.bulkPut(trackables)
    if (completions.length) await db.completions.bulkPut(completions)
    if (groceries.length) await db.groceries.bulkPut(groceries)
  })
}

/**
 * Export a minimal snapshot used for gist sync. Only chores are included with their last completion timestamp.
 */
export async function exportMinimalSnapshot() : Promise<MinimalSnapshot> {
  const chores = await db.trackables.where('type').equals('chore').toArray()

  const items = await Promise.all(chores.map(async (t) => {
    const last = await getLastCompletion(t.id!)
    return {
      id: t.id!,
      lastCompleted: last?.completedAt ? new Date(last.completedAt).toISOString() : null,
      archived: !!t.archived
    }
  }))

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    data: { trackables: items }
  }
}

/**
 * Import a minimal snapshot from gist.
 * mode: 'replace' will delete local chores not present in snapshot.
 * mode: 'merge' will only update/insert completions from snapshot.
 */
export async function importMinimalSnapshot(snapshot: MinimalSnapshot, mode: 'replace' | 'merge' = 'replace') {
  const gistItems = (snapshot.data && snapshot.data.trackables) || []
  const gistIds = new Set(gistItems.map((i: any) => i.id))

  // Update or insert lastCompleted for chores present in gist
  for (const item of gistItems) {
    const local = await db.trackables.get(item.id)
    if (!local) {
      // If the trackable doesn't exist locally, skip (we cannot recreate full trackable from minimal data)
      continue
    }

    // If gist has a lastCompleted timestamp, ensure local DB has that completion
    if (item.lastCompleted) {
      const lastLocal = await getLastCompletion(item.id)
      const lastLocalTime = lastLocal?.completedAt ? new Date(lastLocal.completedAt).getTime() : 0
      const gistTime = new Date(item.lastCompleted).getTime()

      if (!lastLocal || gistTime > lastLocalTime) {
        // Add a completion at the gist time
        await db.completions.add({ trackableId: item.id, completedAt: new Date(item.lastCompleted) })
      }
      // Record lastCompleted on the trackable for convenience
      await db.trackables.update(item.id, { lastCompleted: new Date(item.lastCompleted) })
    } else {
      // No lastCompleted in gist — clear local lastCompleted field
      await db.trackables.update(item.id, { lastCompleted: null })
    }
  }

  if (mode === 'replace') {
    // Remove any local chores not present in gist
    const localChores = await db.trackables.where('type').equals('chore').toArray()
    for (const c of localChores) {
      if (!gistIds.has(c.id!)) {
        await deleteTrackable(c.id!)
      }
    }
  }
}

/**
 * Merge local chores with the current gist snapshot and push merged full snapshot back to gist.
 * Behavior:
 *  - Uses last synced minimal snapshot to detect deletions.
 *  - For each task, keeps the newest lastCompleted timestamp and ensures a completion exists for it.
 *  - Adds tasks present in remote but missing locally.
 *  - Removes tasks deleted on remote since last sync.
 *  - Adds local-only tasks to remote via pushing the full snapshot.
 */
export async function mergeWithGist(): Promise<void> {
  const remote = await fetchCurrentGistSnapshot()
  if (!remote) throw new Error('No gist snapshot found. Set gist ID in Settings and save a snapshot first.')

  const remoteMinimal = minimalFromFullSnapshot(remote)
  const prev = getLastSyncedMinimal()

  const prevIds = new Set((prev?.data.trackables || []).map((t: any) => t.id))
  const remoteIds = new Set((remoteMinimal.data.trackables || []).map((t: any) => t.id))

  // Load local chores
  const localChores = await db.trackables.where('type').equals('chore').toArray()
  const localMap = new Map(localChores.map(t => [t.id!, t]))
  const localIds = new Set(localChores.map(t => t.id!))

  // 1) Remove tasks deleted on remote since last sync
  if (prev) {
    for (const id of prevIds) {
      if (!remoteIds.has(id) && localIds.has(id)) {
        // deleted on remote since last sync => remove locally
        await deleteTrackable(id)
      }
    }
  }

  // Refresh local chores after deletions
  const refreshedLocal = await db.trackables.where('type').equals('chore').toArray()
  const refreshedMap = new Map(refreshedLocal.map(t => [t.id!, t]))

  // 2) For remote items, add missing locally and update lastCompleted
  for (const r of remoteMinimal.data.trackables) {
    const local = refreshedMap.get(r.id)
    if (!local) {
      // If no full remote trackable available, create a placeholder
      // Try to extract full trackable from full snapshot if available
      let candidate: any = null
      if ((remote as any).data?.trackables) {
        candidate = (remote as any).data.trackables.find((tt: any) => tt.id === r.id)
      }

      const newTrackable = candidate ? {
        ...candidate,
        createdAt: candidate.createdAt ? new Date(candidate.createdAt) : new Date(),
        archived: !!candidate.archived
      } : {
        id: r.id,
        type: 'chore',
        name: `Imported task ${r.id}`,
        recurrence: { every: 1, unit: 'days' },
        createdAt: new Date(),
        archived: !!r.archived
      }

      // Use bulkPut to preserve remote id when present
      await db.trackables.bulkPut([newTrackable])
    }

    // Ensure lastCompleted is applied locally if newer
    if (r.lastCompleted) {
      const gistTime = new Date(r.lastCompleted).getTime()
      const lastLocalComp = await getLastCompletion(r.id)
      const lastLocalTime = lastLocalComp?.completedAt ? new Date(lastLocalComp.completedAt).getTime() : 0
      if (!lastLocalComp || gistTime > lastLocalTime) {
        await db.completions.add({ trackableId: r.id, completedAt: new Date(r.lastCompleted) })
        await db.trackables.update(r.id, { lastCompleted: new Date(r.lastCompleted) })
      }
    }
  }

  // 3) Add local-only tasks to remote will be handled by pushing a full snapshot below

  // 4) Export merged full snapshot and push
  const full = await exportSnapshot()
  await upsertCurrentGist(full)

  // 5) Update last-synced minimal snapshot locally
  const newMinimal = minimalFromFullSnapshot(full)
  setLastSyncedMinimal(newMinimal)
}
