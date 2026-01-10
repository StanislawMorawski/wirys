import { db } from '@/db'
import type { Snapshot, MinimalSnapshot } from '@/services/gistStorage'
import { getLastCompletion, deleteTrackable } from '@/db'

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
