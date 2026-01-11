import Dexie, { type Table } from 'dexie'
import type { Trackable, Completion, GroceryItem, Expense } from '@/types'

export class TrackerDatabase extends Dexie {
  trackables!: Table<Trackable>
  completions!: Table<Completion>
  groceries!: Table<GroceryItem>
  expenses!: Table<Expense>

  constructor() {
    super('HomeTrackerDB')
    
    this.version(1).stores({
      trackables: '++id, type, name, archived, createdAt',
      completions: '++id, trackableId, completedAt'
    })
    
    this.version(2).stores({
      trackables: '++id, type, name, archived, createdAt',
      completions: '++id, trackableId, completedAt',
      groceries: '++id, name, checked, createdAt, category'
    })

    this.version(3).stores({
      trackables: '++id, type, name, archived, createdAt, isRepeating, nextDueDate',
      completions: '++id, trackableId, completedAt',
      groceries: '++id, name, checked, createdAt, category'
    })

    this.version(4).stores({
      trackables: '++id, type, name, archived, createdAt, isRepeating, nextDueDate',
      completions: '++id, trackableId, completedAt',
      groceries: '++id, name, checked, createdAt, category',
      expenses: '++id, order, completed, createdAt'
    })

    // Add order field to groceries
    this.version(5).stores({
      trackables: '++id, type, name, archived, createdAt, isRepeating, nextDueDate',
      completions: '++id, trackableId, completedAt',
      groceries: '++id, name, checked, createdAt, category, order',
      expenses: '++id, order, completed, createdAt'
    }).upgrade(async (trans) => {
      // Initialize order field for existing grocery items
      const groceries = await trans.table('groceries').toArray()
      for (let i = 0; i < groceries.length; i++) {
        if (groceries[i].order === undefined) {
          await trans.table('groceries').update(groceries[i].id, { order: i })
        }
      }
    })
  }
}

export const db = new TrackerDatabase()

// Helper functions
export async function getTrackablesByType(type: Trackable['type'], includeArchived = false) {
  let query = db.trackables.where('type').equals(type)
  if (!includeArchived) {
    return query.filter(t => !t.archived).toArray()
  }
  return query.toArray()
}

export async function getCompletionsForTrackable(trackableId: number) {
  return db.completions
    .where('trackableId')
    .equals(trackableId)
    .reverse()
    .sortBy('completedAt')
}

export async function getLastCompletion(trackableId: number) {
  const completions = await db.completions
    .where('trackableId')
    .equals(trackableId)
    .reverse()
    .sortBy('completedAt')
  return completions[0] ?? null
}

export async function getAllCompletions() {
  return db.completions.reverse().sortBy('completedAt')
}

export async function deleteCompletion(id: number): Promise<void> {
  await db.completions.delete(id)
}

export async function deleteTrackable(id: number): Promise<void> {
  await db.transaction('rw', [db.trackables, db.completions], async () => {
    await db.completions.where('trackableId').equals(id).delete()
    await db.trackables.delete(id)
  })
}
