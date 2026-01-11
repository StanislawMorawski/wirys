import { db } from '@/db'
import type { Snapshot, MinimalSnapshot } from '@/services/gistStorage'
import { getLastCompletion, deleteTrackable } from '@/db'
import { fetchCurrentGistSnapshot, upsertCurrentGist, minimalFromFullSnapshot } from '@/services/gistStorage'
import { setLastSyncedMinimal } from '@/services/gistStorage'
import { usePeopleStore } from '@/stores/people'
import { useSettingsStore } from '@/stores/settings'
import { changeTracker } from '@/db/changes'
import type { Trackable, Completion, GroceryItem, Expense } from '@/types'

export async function exportSnapshot(): Promise<Snapshot> {
  const [trackables, completions, groceries, expenses] = await Promise.all([
    db.trackables.toArray(),
    db.completions.toArray(),
    db.groceries.toArray(),
    db.expenses.toArray()
  ])

  const peopleStore = usePeopleStore()
  const settingsStore = useSettingsStore()

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    data: {
      trackables,
      completions,
      groceries,
      expenses,
      people: peopleStore.people,
      preferences: {
        currency: settingsStore.currency,
        budget: settingsStore.budget
      }
    }
  }
}

export async function importSnapshot(snapshot: Snapshot) {
  const { trackables = [], completions = [], groceries = [], expenses = [], people = [], preferences } = (snapshot.data as any) || {}

  // Use transaction to replace existing data atomically
  await db.transaction('rw', [db.trackables, db.completions, db.groceries, db.expenses], async () => {
    await Promise.all([
      db.trackables.clear(),
      db.completions.clear(),
      db.groceries.clear(),
      db.expenses.clear()
    ])

    // bulkPut respects provided ids when present
    if (trackables.length) await db.trackables.bulkPut(trackables)
    if (completions.length) await db.completions.bulkPut(completions)
    if (groceries.length) await db.groceries.bulkPut(groceries)
    if (expenses.length) await db.expenses.bulkPut(expenses)
  })

  // Import people and preferences
  if (people && people.length > 0) {
    const peopleStore = usePeopleStore()
    peopleStore.people = people
    peopleStore.savePeople()
  }

  if (preferences) {
    const settingsStore = useSettingsStore()
    if (preferences.currency) settingsStore.setCurrency(preferences.currency)
    if (preferences.budget !== undefined) settingsStore.setBudget(preferences.budget)
  }
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
      await db.trackables.update(item.id, { lastCompleted: undefined })
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
 * Merge local changes with the current gist snapshot and push merged full snapshot back to gist.
 * New behavior:
 *  1. Fetch current cloud state
 *  2. Load cloud state locally (overwrite local db)
 *  3. Apply tracked local changes on top
 *  4. Push merged state back to cloud
 *  5. Clear tracked changes
 */
export async function mergeWithGist(): Promise<void> {
  const remote = await fetchCurrentGistSnapshot()
  if (!remote) throw new Error('No gist snapshot found. Set gist ID in Settings and save a snapshot first.')

  // Get tracked local changes before importing
  const localChanges = changeTracker.getChanges()
  
  console.log(`Syncing with ${localChanges.length} local changes...`)
  console.log('Local changes:', localChanges)

  // Step 1: Import cloud state (this overwrites local data)
  console.log('Importing cloud state...')
  await importSnapshot(remote)

  // Step 2: Apply local changes on top of cloud state (if any)
  if (localChanges.length > 0) {
    console.log('Applying local changes...')
    await applyChanges(localChanges)
    
    // Step 3: Export merged state and push back to cloud
    console.log('Exporting merged state...')
    const merged = await exportSnapshot()
    console.log('Pushing to cloud...')
    await upsertCurrentGist(merged)
    
    // Step 4: Clear tracked changes after successful sync
    console.log('Clearing local changes...')
    changeTracker.clearChanges()
    
    // Update last-synced minimal snapshot
    const newMinimal = minimalFromFullSnapshot(merged)
    setLastSyncedMinimal(newMinimal)
  } else {
    console.log('No local changes, just updating from cloud')
    // Update last-synced minimal snapshot even when no local changes
    const current = await exportSnapshot()
    const newMinimal = minimalFromFullSnapshot(current)
    setLastSyncedMinimal(newMinimal)
  }
  
  console.log('Sync complete!')
}

/**
 * Apply tracked changes to the current database state
 */
async function applyChanges(changes: ReturnType<typeof changeTracker.getChanges>) {
  for (const change of changes) {
    try {
      switch (change.entityType) {
        case 'trackable':
          await applyTrackableChange(change)
          break
        case 'completion':
          await applyCompletionChange(change)
          break
        case 'grocery':
          await applyGroceryChange(change)
          break
        case 'expense':
          await applyExpenseChange(change)
          break
      }
    } catch (e) {
      console.error(`Failed to apply change ${change.id}:`, e)
    }
  }
}

async function applyTrackableChange(change: any) {
  if (change.changeType === 'delete') {
    // Delete trackable and its completions
    const existing = await db.trackables.get(change.entityId)
    if (existing) {
      await db.transaction('rw', [db.trackables, db.completions], async () => {
        await db.completions.where('trackableId').equals(change.entityId).delete()
        await db.trackables.delete(change.entityId)
      })
    }
  } else {
    // Add or update trackable
    const data = change.data as Trackable
    // Ensure dates are Date objects
    if (data.createdAt && typeof data.createdAt === 'string') {
      data.createdAt = new Date(data.createdAt)
    }
    if (data.lastCompleted && typeof data.lastCompleted === 'string') {
      data.lastCompleted = new Date(data.lastCompleted)
    }
    if (data.nextDueDate && typeof data.nextDueDate === 'string') {
      data.nextDueDate = new Date(data.nextDueDate)
    }
    await db.trackables.put(data)
  }
}

async function applyCompletionChange(change: any) {
  if (change.changeType === 'delete') {
    await db.completions.delete(change.entityId)
  } else {
    const data = change.data as Completion
    // Ensure completedAt is a Date object
    if (data.completedAt && typeof data.completedAt === 'string') {
      data.completedAt = new Date(data.completedAt)
    }
    await db.completions.put(data)
  }
}

async function applyGroceryChange(change: any) {
  if (change.changeType === 'delete') {
    await db.groceries.delete(change.entityId)
  } else {
    const data = change.data as GroceryItem
    // Ensure createdAt is a Date object
    if (data.createdAt && typeof data.createdAt === 'string') {
      data.createdAt = new Date(data.createdAt)
    }
    await db.groceries.put(data)
  }
}

async function applyExpenseChange(change: any) {
  if (change.changeType === 'delete') {
    await db.expenses.delete(change.entityId)
  } else {
    const data = change.data as Expense
    // Ensure createdAt is a Date object
    if (data.createdAt && typeof data.createdAt === 'string') {
      data.createdAt = new Date(data.createdAt)
    }
    await db.expenses.put(data)
  }
}
