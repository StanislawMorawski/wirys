import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { db, getTrackablesByType, getCompletionsForTrackable, getLastCompletion } from '@/db'
import { getNow, offsetMs } from '@/dev/time'
import type { Trackable, Completion, TrackableWithStatus, TrackableType, Recurrence } from '@/types'
import { changeTracker } from '@/db/changes' 

function calculateNextDue(lastCompleted: Date | undefined, recurrence: Recurrence, createdAt: Date): Date {
  const baseDate = lastCompleted || createdAt
  const next = new Date(baseDate)
  
  switch (recurrence.unit) {
    case 'days':
      next.setDate(next.getDate() + recurrence.every)
      break
    case 'weeks':
      next.setDate(next.getDate() + recurrence.every * 7)
      break
    case 'months':
      next.setMonth(next.getMonth() + recurrence.every)
      break
  }
  return next
}

function getDaysOverdue(nextDue: Date): number {
  const now = getNow()
  const diff = now.getTime() - nextDue.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getRecurrenceInDays(recurrence: Recurrence): number {
  switch (recurrence.unit) {
    case 'days': return recurrence.every
    case 'weeks': return recurrence.every * 7
    case 'months': return recurrence.every * 30
  }
}

function calculateExerciseDebt(
  trackable: Trackable,
  completions: Completion[]
): { debt: number; totalCompleted: number; canDoAdvance: boolean; advanceAmount: number; currentPeriodTarget: number; currentPeriodDone: number } {
  const targetAmount = trackable.targetAmount || 0
  const recurrenceDays = getRecurrenceInDays(trackable.recurrence)
  
  const now = getNow()
  const created = new Date(trackable.createdAt)
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  
  // Past completed periods (not including current day/period)
  const pastPeriodsCount = Math.floor(daysSinceCreation / recurrenceDays)
  
  // What was required in past periods (debt accumulates from past only)
  const pastRequired = pastPeriodsCount * targetAmount
  
  // Current period target (today's work, not debt)
  const currentPeriodTarget = targetAmount

  // Max allowed includes current period + 1 advance period
  const maxAllowed = (pastPeriodsCount + 2) * targetAmount

  // Total completed amount
  const totalCompleted = completions.reduce((sum, c) => sum + (c.amount || 0), 0)

  // Debt is only from PAST periods, not current
  const debt = Math.max(0, pastRequired - totalCompleted)

  // How much is done for current period (after paying off debt)
  const availableForCurrent = Math.max(0, totalCompleted - pastRequired)
  const currentPeriodDone = Math.min(availableForCurrent, currentPeriodTarget)

  // Advance amount is anything beyond current period's target but cap to at most one period
  const rawAdvance = Math.max(0, availableForCurrent - currentPeriodTarget)
  const advanceAmount = Math.min(rawAdvance, targetAmount)

  // Can do advance if current period is done and not maxed out
  const canDoAdvance = debt === 0 && totalCompleted < maxAllowed

  return { debt, totalCompleted, canDoAdvance, advanceAmount, currentPeriodTarget, currentPeriodDone }
}

export const useTrackableStore = defineStore('trackables', () => {
  const trackables = ref<TrackableWithStatus[]>([])
  const loading = ref(false)
  const currentType = ref<TrackableType>('chore')
  const currentPersonId = ref<string | null>(null)

  const sortedTrackables = computed(() => {
    return [...trackables.value].sort((a, b) => {
      // For exercises, sort by debt first
      if (a.type === 'exercise' && b.type === 'exercise') {
        const aDebt = a.debt || 0
        const bDebt = b.debt || 0
        if (aDebt !== bDebt) return bDebt - aDebt
      }
      
      // For chores, sort by priority: overdue > due today > singular (all) > future
      if (a.type === 'chore' && b.type === 'chore') {
        // Calculate if due today
        const now = getNow()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        const aDueToday = a.nextDue ? new Date(a.nextDue.getFullYear(), a.nextDue.getMonth(), a.nextDue.getDate()).getTime() === today.getTime() : false
        const bDueToday = b.nextDue ? new Date(b.nextDue.getFullYear(), b.nextDue.getMonth(), b.nextDue.getDate()).getTime() === today.getTime() : false
        
        const aOverdue = a.daysOverdue > 0
        const bOverdue = b.daysOverdue > 0
        
        const aSingular = a.isRepeating === false
        const bSingular = b.isRepeating === false
        
        // Priority: overdue > due today > all singular (completed and uncompleted) > future
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        if (aDueToday && !bDueToday) return -1
        if (!aDueToday && bDueToday) return 1
        if (aSingular && !bSingular) return -1
        if (!aSingular && bSingular) return 1
        
        // Within same priority, sort by next due date
        if (a.nextDue && b.nextDue) {
          return a.nextDue.getTime() - b.nextDue.getTime()
        }
        if (a.nextDue && !b.nextDue) return -1
        if (!a.nextDue && b.nextDue) return 1
      }
      
      return 0
    })
  })

  async function loadTrackables(type: TrackableType, personId?: string) {
    loading.value = true
    currentType.value = type
    currentPersonId.value = personId || null
    
    try {
      let items = await getTrackablesByType(type)
      
      // Filter by person for exercises
      if (type === 'exercise' && personId) {
        items = items.filter(t => t.personId === personId)
      }
      
      // Auto-archive completed singular chores that are more than 1 day old
      if (type === 'chore') {
        const now = getNow()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        for (const item of items) {
          if (item.isRepeating === false && item.lastCompleted) {
            const lastCompletedDate = new Date(item.lastCompleted)
            // Only archive if completed AND the due date has passed by more than a day
            // This prevents archiving if the chore was unchecked
            const completions = await db.completions.where('trackableId').equals(item.id!).toArray()
            if (completions.length > 0 && lastCompletedDate < oneDayAgo && !item.archived) {
              await db.trackables.update(item.id!, { archived: true })
            }
          }
        }
        
        // Reload after auto-archiving
        items = await getTrackablesByType(type)
      }
      
      const withStatus: TrackableWithStatus[] = await Promise.all(
        items.map(async (t) => {
          const lastCompletion = await getLastCompletion(t.id!)
          const completions = await getCompletionsForTrackable(t.id!)
          const lastCompleted = lastCompletion?.completedAt
          
          let nextDue: Date
          let daysOverdue = 0
          
          // For chores with custom nextDueDate, use that
          if (type === 'chore' && t.nextDueDate) {
            nextDue = new Date(t.nextDueDate)
          } else {
            nextDue = calculateNextDue(lastCompleted, t.recurrence, t.createdAt)
          }
          
          // For singular chores, don't calculate overdue if already completed
          if (type === 'chore' && t.isRepeating === false && lastCompleted) {
            daysOverdue = 0
          } else {
            daysOverdue = getDaysOverdue(nextDue)
          }
          
          // Calculate debt for exercises
          let debt = 0
          let totalCompleted = 0
          let canDoAdvance = true
          let advanceAmount = 0
          let currentPeriodTarget = 0
          let currentPeriodDone = 0
          let monthlyCompletions = 0
          let yearlyCompletions = 0
          
          if (type === 'exercise') {
            const debtInfo = calculateExerciseDebt(t, completions)
            debt = debtInfo.debt
            totalCompleted = debtInfo.totalCompleted
            canDoAdvance = debtInfo.canDoAdvance
            advanceAmount = debtInfo.advanceAmount
            currentPeriodTarget = debtInfo.currentPeriodTarget
            currentPeriodDone = debtInfo.currentPeriodDone
            
            // Calculate monthly and yearly stats (total amounts, not just count)
            const now = getNow()
            const thisMonth = now.getMonth()
            const thisYear = now.getFullYear()
            
            monthlyCompletions = completions
              .filter(c => {
                const d = new Date(c.completedAt)
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear
              })
              .reduce((sum, c) => sum + (c.amount || 0), 0)
            
            yearlyCompletions = completions
              .filter(c => {
                const d = new Date(c.completedAt)
                return d.getFullYear() === thisYear
              })
              .reduce((sum, c) => sum + (c.amount || 0), 0)
          }
          
          return {
            ...t,
            lastCompleted,
            nextDue,
            isOverdue: type === 'exercise' ? debt > 0 : daysOverdue > 0,
            daysOverdue,
            completionCount: completions.length,
            debt,
            totalCompleted,
            canDoAdvance,
            advanceAmount,
            currentPeriodTarget,
            currentPeriodDone,
            monthlyCompletions,
            yearlyCompletions
          }
        })
      )
      trackables.value = withStatus
    } finally {
      loading.value = false
    }
  }

  // When dev time offset changes, reload to recompute overdue, debt, etc.
  watch(() => offsetMs.value, () => {
    // Avoid calling while loading to prevent overlapping calls
    if (!loading.value) {
      loadTrackables(currentType.value, currentPersonId.value || undefined)
    }
  })

  async function addTrackable(data: Omit<Trackable, 'id' | 'createdAt' | 'archived'>) {
    const now = getNow()
    const trackable: Trackable = {
      ...data,
      createdAt: now,
      archived: false
    }
    
    // Set defaults for chores
    if (data.type === 'chore') {
      if (data.isRepeating === undefined) {
        trackable.isRepeating = false
      }
      
      // If nextDueDate not set and we have daysUntilDue, calculate it
      if (!trackable.nextDueDate && data.daysUntilDue !== undefined) {
        const nextDue = new Date(now)
        nextDue.setDate(nextDue.getDate() + data.daysUntilDue)
        trackable.nextDueDate = nextDue
      } else if (!trackable.nextDueDate && trackable.isRepeating) {
        // For repeating chores without explicit due date, use recurrence interval
        trackable.nextDueDate = calculateNextDue(undefined, trackable.recurrence, now)
      } else if (!trackable.nextDueDate) {
        // For singular chores without explicit due date, default to today
        trackable.nextDueDate = now
      }
    }
    
    const id = await db.trackables.add(trackable)
    const added = await db.trackables.get(id)
    if (added) {
      changeTracker.trackAddOrUpdate('trackable', id, added)
    }
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function updateTrackable(id: number, data: Partial<Trackable>) {
    await db.trackables.update(id, data)
    const updated = await db.trackables.get(id)
    if (updated) {
      changeTracker.trackAddOrUpdate('trackable', id, updated)
    }
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function deleteTrackable(id: number) {
    console.log('Store deleteTrackable called with id:', id)
    try {
      await db.transaction('rw', [db.trackables, db.completions], async () => {
        const deleted = await db.completions.where('trackableId').equals(id).delete()
        console.log('Deleted completions:', deleted)
        await db.trackables.delete(id)
        changeTracker.trackDelete('trackable', id)
        console.log('Deleted trackable')
      })
      await loadTrackables(currentType.value, currentPersonId.value || undefined)
      console.log('Reloaded trackables')
    } catch (e) {
      console.error('Error in deleteTrackable:', e)
      throw e
    }
  }

  async function markComplete(trackableId: number, notes?: string, amount?: number) {
    const trackable = await db.trackables.get(trackableId)
    let finalAmount = amount === undefined ? 1 : amount

    // For repeating chores, check if already completed today
    if (trackable?.type === 'chore' && trackable.isRepeating !== false) {
      const completions = await getCompletionsForTrackable(trackableId)
      const now = getNow()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Check if there's already a completion today
      const completedToday = completions.some(c => {
        const completedDate = new Date(c.completedAt)
        const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())
        return completedDay.getTime() === today.getTime()
      })
      
      if (completedToday) {
        console.warn('markComplete: repeating chore already completed today', trackableId)
        return
      }
    }

    // Enforce allowed amounts for exercises: don't allow more than 1 quota in advance
    if (trackable?.type === 'exercise') {
      const completions = await getCompletionsForTrackable(trackableId)
      const targetAmount = trackable.targetAmount || 0
      const recurrenceDays = getRecurrenceInDays(trackable.recurrence)
      const now = getNow()
      const created = new Date(trackable.createdAt)
      const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      const pastPeriodsCount = Math.floor(daysSinceCreation / recurrenceDays)
      const maxAllowed = (pastPeriodsCount + 2) * targetAmount
      const totalCompleted = completions.reduce((sum, c) => sum + (c.amount || 0), 0)

      const remainingAllowed = Math.max(0, maxAllowed - totalCompleted)

      if (remainingAllowed <= 0) {
        // Nothing allowed — already at max (past + current + 1 advance)
        console.warn('markComplete: no remaining allowed amount for exercise', trackableId)
        return
      }

      // Cap the requested amount to what remains
      finalAmount = Math.min(finalAmount, remainingAllowed)
    }

    const completion: Completion = {
      trackableId,
      completedAt: getNow(),
      notes,
      amount: finalAmount
    }
    const completionId = await db.completions.add(completion)
    const added = await db.completions.get(completionId)
    if (added) {
      changeTracker.trackAddOrUpdate('completion', completionId, added)
    }
    
    // For repeating chores, store the previous nextDueDate and recalculate new one
    if (trackable?.type === 'chore' && trackable.isRepeating !== false) {
      const prevNextDueDate = trackable.nextDueDate
      const nextDue = calculateNextDue(completion.completedAt, trackable.recurrence, trackable.createdAt)
      await db.trackables.update(trackableId, { 
        lastCompleted: completion.completedAt,
        nextDueDate: nextDue,
        previousNextDueDate: prevNextDueDate
      })
      const updated = await db.trackables.get(trackableId)
      if (updated) {
        changeTracker.trackAddOrUpdate('trackable', trackableId, updated)
      }
    } else {
      // For exercises and singular chores, just persist lastCompleted
      await db.trackables.update(trackableId, { lastCompleted: completion.completedAt })
      const updated = await db.trackables.get(trackableId)
      if (updated) {
        changeTracker.trackAddOrUpdate('trackable', trackableId, updated)
      }
    }
    
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function getHistory(trackableId: number): Promise<Completion[]> {
    return getCompletionsForTrackable(trackableId)
  }

  async function deleteCompletion(id: number) {
    await db.completions.delete(id)
    changeTracker.trackDelete('completion', id)
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function uncompleteTrackable(trackableId: number) {
    const trackable = await db.trackables.get(trackableId)
    
    // Find the most recent completion
    const completions = await db.completions
      .where('trackableId')
      .equals(trackableId)
      .reverse()
      .sortBy('completedAt')
    
    if (completions.length > 0) {
      const lastCompletion = completions[0]
      const now = getNow()
      const completedDate = new Date(lastCompletion.completedAt)
      
      // One-time tasks can always be undone
      const isOneTime = trackable?.type === 'chore' && trackable.isRepeating === false
      
      if (isOneTime) {
        // Delete the completion regardless of when it was done
        if (lastCompletion.id) {
          await deleteCompletion(lastCompletion.id)
          
          // Update trackable's lastCompleted to previous completion
          const remaining = await db.completions
            .where('trackableId')
            .equals(trackableId)
            .reverse()
            .sortBy('completedAt')
          
          if (remaining.length > 0) {
            await db.trackables.update(trackableId, { lastCompleted: remaining[0].completedAt })
          } else {
            await db.trackables.update(trackableId, { lastCompleted: undefined })
          }
        }
      } else {
        // For repeating tasks and exercises, check if completion was done today
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())
        const isSameDay = nowDay.getTime() === completedDay.getTime()
        
        // Only delete if it was done today
        if (isSameDay && lastCompletion.id) {
          await deleteCompletion(lastCompletion.id)
          
          // Update trackable's lastCompleted to previous completion
          const remaining = await db.completions
            .where('trackableId')
            .equals(trackableId)
            .reverse()
            .sortBy('completedAt')
          
          // For repeating chores, restore the previous nextDueDate that was cached
          if (trackable?.type === 'chore' && trackable.isRepeating !== false) {
            if (remaining.length > 0) {
              const newLastCompleted = remaining[0].completedAt
              // Restore the previousNextDueDate if it was stored
              const restoredNextDue = trackable.previousNextDueDate || calculateNextDue(newLastCompleted, trackable.recurrence, trackable.createdAt)
              await db.trackables.update(trackableId, { 
                lastCompleted: newLastCompleted,
                nextDueDate: restoredNextDue,
                previousNextDueDate: undefined
              })
            } else {
              // No completions left, restore the previousNextDueDate if it was stored
              const restoredNextDue = trackable.previousNextDueDate || calculateNextDue(undefined, trackable.recurrence, trackable.createdAt)
              await db.trackables.update(trackableId, { 
                lastCompleted: undefined,
                nextDueDate: restoredNextDue,
                previousNextDueDate: undefined
              })
            }
          } else {
            // For exercises, just update lastCompleted
            if (remaining.length > 0) {
              await db.trackables.update(trackableId, { lastCompleted: remaining[0].completedAt })
            } else {
              await db.trackables.update(trackableId, { lastCompleted: undefined })
            }
          }
        }
      }
    }

    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function markCompletePast(trackableId: number, daysAgo: number) {
    const trackable = await db.trackables.get(trackableId)
    const now = getNow()
    const pastDate = new Date(now)
    pastDate.setDate(pastDate.getDate() - daysAgo)
    // Set to end of that day
    pastDate.setHours(23, 59, 59, 999)
    
    const completion: Completion = {
      trackableId,
      completedAt: pastDate,
      amount: 1
    }
    
    const completionId = await db.completions.add(completion)
    const added = await db.completions.get(completionId)
    if (added) {
      changeTracker.trackAddOrUpdate('completion', completionId, added)
    }
    
    // Update trackable's lastCompleted if this is now the most recent
    const allCompletions = await db.completions
      .where('trackableId')
      .equals(trackableId)
      .reverse()
      .sortBy('completedAt')
    
    if (allCompletions.length > 0) {
      const mostRecent = allCompletions[0].completedAt
      
      // For repeating chores, always recalculate next due date from most recent completion
      if (trackable?.type === 'chore' && trackable.isRepeating !== false) {
        const nextDue = calculateNextDue(mostRecent, trackable.recurrence, trackable.createdAt)
        await db.trackables.update(trackableId, { 
          lastCompleted: mostRecent,
          nextDueDate: nextDue
        })
      } else {
        await db.trackables.update(trackableId, { 
          lastCompleted: mostRecent
        })
      }
      
      const updated = await db.trackables.get(trackableId)
      if (updated) {
        changeTracker.trackAddOrUpdate('trackable', trackableId, updated)
      }
    }
    
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  return {
    trackables,
    sortedTrackables,
    loading,
    currentType,
    loadTrackables,
    addTrackable,
    updateTrackable,
    deleteTrackable,
    markComplete,
    getHistory,
    deleteCompletion,
    uncompleteTrackable,
    markCompletePast
  }
})
