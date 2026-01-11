/**
 * Change tracking for sync operations
 * Tracks local changes (add/update/delete) to be applied during sync
 */

export type ChangeType = 'add' | 'update' | 'delete'
export type EntityType = 'trackable' | 'completion' | 'grocery' | 'expense'

export interface Change {
  id: string
  entityType: EntityType
  changeType: ChangeType
  entityId: string | number
  data?: any // Full entity data for add/update, undefined for delete
  timestamp: number
}

const STORAGE_KEY = 'wirys-local-changes'

class ChangeTracker {
  private changes: Map<string, Change> = new Map()

  constructor() {
    this.loadChanges()
  }

  private loadChanges() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const changeArray = JSON.parse(stored) as Change[]
        this.changes = new Map(changeArray.map(c => [c.id, c]))
      }
    } catch (e) {
      console.error('Failed to load changes:', e)
      this.changes = new Map()
    }
  }

  private saveChanges() {
    try {
      const changeArray = Array.from(this.changes.values())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(changeArray))
    } catch (e) {
      console.error('Failed to save changes:', e)
    }
  }

  /**
   * Track an addition or update
   */
  trackAddOrUpdate(entityType: EntityType, entityId: string | number, data: any) {
    const changeId = `${entityType}-${entityId}`
    const existing = this.changes.get(changeId)

    // If this entity was previously marked for deletion, convert to update
    // Otherwise, preserve 'add' if it was an add, or mark as 'update'
    const changeType: ChangeType = existing?.changeType === 'delete' 
      ? 'update' 
      : existing?.changeType === 'add'
      ? 'add'
      : 'update'

    this.changes.set(changeId, {
      id: changeId,
      entityType,
      changeType,
      entityId,
      data,
      timestamp: Date.now()
    })

    this.saveChanges()
  }

  /**
   * Track a deletion
   */
  trackDelete(entityType: EntityType, entityId: string | number) {
    const changeId = `${entityType}-${entityId}`
    const existing = this.changes.get(changeId)

    // If it was a local add, just remove the change entirely (never synced to cloud)
    if (existing?.changeType === 'add') {
      this.changes.delete(changeId)
    } else {
      // Otherwise mark for deletion
      this.changes.set(changeId, {
        id: changeId,
        entityType,
        changeType: 'delete',
        entityId,
        timestamp: Date.now()
      })
    }

    this.saveChanges()
  }

  /**
   * Get all tracked changes
   */
  getChanges(): Change[] {
    return Array.from(this.changes.values()).sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get changes for a specific entity type
   */
  getChangesByType(entityType: EntityType): Change[] {
    return this.getChanges().filter(c => c.entityType === entityType)
  }

  /**
   * Clear all changes (after successful sync)
   */
  clearChanges() {
    this.changes.clear()
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Check if there are pending changes
   */
  hasChanges(): boolean {
    return this.changes.size > 0
  }

  /**
   * Get count of pending changes
   */
  getChangeCount(): number {
    return this.changes.size
  }
}

// Singleton instance
export const changeTracker = new ChangeTracker()
