import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { db, getTrackablesByType, getCompletionsForTrackable, getLastCompletion } from '@/db'
import { getNow, offsetMs } from '@/dev/time'
import type { Trackable, Completion, TrackableWithStatus, TrackableType, Recurrence } from '@/types' 

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
      // Overdue items first, then by days overdue
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      if (a.isOverdue && b.isOverdue) {
        return b.daysOverdue - a.daysOverdue
      }
      // Never done items next
      if (!a.lastCompleted && b.lastCompleted) return -1
      if (a.lastCompleted && !b.lastCompleted) return 1
      // Then by next due date
      if (a.nextDue && b.nextDue) {
        return a.nextDue.getTime() - b.nextDue.getTime()
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
      
      const withStatus: TrackableWithStatus[] = await Promise.all(
        items.map(async (t) => {
          const lastCompletion = await getLastCompletion(t.id!)
          const completions = await getCompletionsForTrackable(t.id!)
          const lastCompleted = lastCompletion?.completedAt
          const nextDue = calculateNextDue(lastCompleted, t.recurrence, t.createdAt)
          const daysOverdue = getDaysOverdue(nextDue)
          
          // Calculate debt for exercises
          let debt = 0
          let totalCompleted = 0
          let canDoAdvance = true
          let advanceAmount = 0
          let currentPeriodTarget = 0
          let currentPeriodDone = 0
          if (type === 'exercise') {
            const debtInfo = calculateExerciseDebt(t, completions)
            debt = debtInfo.debt
            totalCompleted = debtInfo.totalCompleted
            canDoAdvance = debtInfo.canDoAdvance
            advanceAmount = debtInfo.advanceAmount
            currentPeriodTarget = debtInfo.currentPeriodTarget
            currentPeriodDone = debtInfo.currentPeriodDone
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
            currentPeriodDone
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
    const trackable: Trackable = {
      ...data,
      createdAt: getNow(),
      archived: false
    }
    await db.trackables.add(trackable)
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function updateTrackable(id: number, data: Partial<Trackable>) {
    await db.trackables.update(id, data)
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function deleteTrackable(id: number) {
    console.log('Store deleteTrackable called with id:', id)
    try {
      await db.transaction('rw', [db.trackables, db.completions], async () => {
        const deleted = await db.completions.where('trackableId').equals(id).delete()
        console.log('Deleted completions:', deleted)
        await db.trackables.delete(id)
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
    // Enforce allowed amounts for exercises: don't allow more than 1 quota in advance
    const trackable = await db.trackables.get(trackableId)
    let finalAmount = amount === undefined ? 1 : amount

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
    await db.completions.add(completion)
    // persist lastCompleted timestamp on the trackable
    await db.trackables.update(trackableId, { lastCompleted: completion.completedAt })
    await loadTrackables(currentType.value, currentPersonId.value || undefined)
  }

  async function getHistory(trackableId: number): Promise<Completion[]> {
    return getCompletionsForTrackable(trackableId)
  }

  async function deleteCompletion(id: number) {
    await db.completions.delete(id)
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
    deleteCompletion
  }
})
