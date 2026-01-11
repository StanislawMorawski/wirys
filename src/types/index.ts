export type TrackableType = 'chore' | 'exercise'

export type RecurrenceUnit = 'days' | 'weeks' | 'months'

export type ExerciseUnit = 'reps' | 'km' | 'steps' | 'minutes' | 'sets'

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'PLN' | 'CAD' | 'AUD'

export interface Recurrence {
  every: number
  unit: RecurrenceUnit
}

export interface Trackable {
  id?: number
  type: TrackableType
  name: string
  description?: string
  recurrence: Recurrence
  createdAt: Date
  archived: boolean
  // Persist the last completion timestamp (useful for minimal gist sync)
  lastCompleted?: Date
  // Exercise-specific fields
  personId?: string
  exerciseUnit?: ExerciseUnit
  targetAmount?: number
  // Chore-specific fields
  isRepeating?: boolean
  daysUntilDue?: number
  nextDueDate?: Date
  previousNextDueDate?: Date
}

export interface Completion {
  id?: number
  trackableId: number
  completedAt: Date
  notes?: string
  // Exercise-specific: amount completed
  amount?: number
}

export interface Person {
  id: string
  name: string
  emoji: string
}

export interface TrackableWithStatus extends Trackable {
  lastCompleted?: Date
  nextDue?: Date
  isOverdue: boolean
  daysOverdue: number
  completionCount: number
  // Exercise-specific: accumulated debt
  debt?: number
  totalCompleted?: number
  canDoAdvance?: boolean
  advanceAmount?: number
  currentPeriodTarget?: number
  currentPeriodDone?: number
  // Exercise stats
  monthlyCompletions?: number
  yearlyCompletions?: number
}

// Grocery list types
export interface GroceryItem {
  id?: number
  name: string
  quantity?: string
  checked: boolean
  createdAt: Date
  category?: string
  order: number
}

export interface Expense {
  id?: number
  name: string
  description?: string
  cost: number
  order: number
  completed: boolean
  createdAt: Date
}
