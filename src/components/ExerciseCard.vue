<script setup lang="ts">
import type { TrackableWithStatus } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  logExercise: []
  completeToday: []
  edit: []
  viewHistory: []
}>()

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(date))
}

function formatRecurrence(item: TrackableWithStatus): string {
  const { every, unit } = item.recurrence
  const target = item.targetAmount || 0
  const unitLabel = item.exerciseUnit || 'reps'
  if (every === 1) {
    return `${target} ${unitLabel} / ${unit.slice(0, -1)}`
  }
  return `${target} ${unitLabel} / ${every} ${unit}`
}

// Is today's quota met?
const isTodayDone = computed(() => {
  const target = props.item.currentPeriodTarget || props.item.targetAmount || 1
  const done = props.item.currentPeriodDone || 0
  return done >= target
})

const statusColor = computed(() => {
  if (props.item.debt && props.item.debt > 0) return 'bg-red-50 border-red-200'
  if (isTodayDone.value) {
    // If done and no advance, show neutral/gray; if we have advance, show blue
    if (props.item.advanceAmount && props.item.advanceAmount > 0) return 'bg-blue-50 border-blue-200'
    return 'bg-gray-50 border-gray-200'
  }
  return 'bg-yellow-50 border-yellow-200' // Todo state
})

const canQuickComplete = computed(() => {
  const target = props.item.targetAmount || 0
  const done = props.item.currentPeriodDone || 0
  // If today's quota not yet complete, we can complete it
  if (done < target) return true
  // Otherwise only if we can do advance and haven't already used the single advance
  if (props.item.canDoAdvance && (props.item.advanceAmount || 0) < target) return true
  return false
})

const debtDisplay = computed(() => {
  const debt = props.item.debt || 0
  const unit = props.item.exerciseUnit || 'reps'
  return `${debt} ${unit}`
})

const advanceDisplay = computed(() => {
  const advance = props.item.advanceAmount || 0
  const unit = props.item.exerciseUnit || 'reps'
  return `${advance} ${unit}`
})

// Progress for today's work (what portion of today's target is done)
const todayProgressPercent = computed(() => {
  const target = props.item.currentPeriodTarget || props.item.targetAmount || 1
  const currentDone = props.item.currentPeriodDone || 0
  return Math.min(100, Math.round((currentDone / target) * 100))
})

// Progress for advance work (as percentage of one period)
const advanceProgressPercent = computed(() => {
  const target = props.item.targetAmount || 1
  const advance = props.item.advanceAmount || 0
  return Math.min(100, Math.round((advance / target) * 100))
})

// Progress for advance work (as percentage of one period)
// (Note: advancePercent shows only the advance portion relative to one period)
// Position for advance bar — anchor at left:0 and set width to advancePercent so small advances are shown proportionally
const advanceBarPosition = computed(() => {
  const width = advanceProgressPercent.value
  return { left: 0, width }
})

// Debt progress (how much of today's target equivalent is owed)
const debtPercent = computed(() => {
  const target = props.item.targetAmount || 1
  const debt = props.item.debt || 0
  // Show debt as portion relative to one period
  return Math.min(100, Math.round((debt / target) * 100))
})
</script>

<template>
  <div
    class="rounded-xl border p-4 shadow-sm transition-all"
    :class="statusColor"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-gray-900 truncate">{{ item.name }}</h3>
          <span
            v-if="item.debt && item.debt > 0"
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700"
          >
            Debt: {{ debtDisplay }}
          </span>
          <template v-else-if="isTodayDone">
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700"
            >
              ✓ Done
            </span>
            <span
              v-if="item.advanceAmount && item.advanceAmount > 0"
              class="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700"
            >
              +{{ advanceDisplay }} ahead
            </span>
          </template>
          <span
            v-else
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700"
          >
            Todo
          </span>
        </div>
        
        <p v-if="item.description" class="text-sm text-gray-600 mt-1 line-clamp-2">
          {{ item.description }}
        </p>
        
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span class="flex items-center gap-1">
            <span>🎯</span>
            {{ formatRecurrence(item) }}
          </span>
          <span class="flex items-center gap-1">
            <span>📊</span>
            {{ item.totalCompleted || 0 }} {{ item.exerciseUnit || 'reps' }} total
          </span>
        </div>
        
        <!-- Progress bar -->
        <div class="mt-3">
          <!-- Show debt bar if there's debt -->
          <template v-if="item.debt && item.debt > 0">
            <div class="h-3 bg-red-200 rounded-full overflow-hidden">
              <div 
                class="h-full bg-red-500 transition-all duration-300"
                :style="{ width: `${Math.min(debtPercent, 100)}%` }"
              ></div>
            </div>
            <div class="text-xs text-red-600 mt-1">
              {{ item.debt }} {{ item.exerciseUnit || 'reps' }} debt from past periods
            </div>
          </template>
          
          <!-- Show today's progress when not done yet -->
          <template v-else-if="!isTodayDone">
            <div class="h-3 bg-gray-200 rounded-full overflow-hidden relative">
              <div 
                class="h-full bg-yellow-500 transition-all duration-300 absolute left-0 top-0"
                :style="{ width: `${todayProgressPercent}%` }"
              ></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Today: {{ item.currentPeriodDone || 0 }}/{{ item.currentPeriodTarget || item.targetAmount }} {{ item.exerciseUnit || 'reps' }}
            </div>
          </template>
          
          <!-- Show today's progress + advance when done -->
          <template v-else>
            <div class="h-3 bg-gray-200 rounded-full overflow-hidden relative">
              <!-- Today's progress (green) -->
              <div 
                class="h-full bg-green-500 transition-all duration-300 absolute left-0 top-0"
                :style="{ width: `${Math.min(todayProgressPercent, 100)}%` }"
              ></div>
              <!-- Advance progress (blue) -->
              <div 
                v-if="advanceProgressPercent > 0"
                class="h-full bg-blue-500 transition-all duration-300 absolute top-0 opacity-90"
                :style="{ left: `${advanceBarPosition.left}%`, width: `${advanceBarPosition.width}%`, zIndex: 10 }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>
                Today: {{ item.currentPeriodDone || 0 }}/{{ item.currentPeriodTarget || item.targetAmount }} {{ item.exerciseUnit || 'reps' }}
              </span>
              <span v-if="advanceProgressPercent > 0" class="text-blue-600">
                +{{ item.advanceAmount }} ahead
              </span>
              <span v-else-if="item.canDoAdvance && todayProgressPercent >= 100" class="text-blue-600">
                Can do +1 day ahead
              </span>
            </div>
          </template>
        </div>
        
        <div class="text-sm text-gray-500 mt-1">
          Last logged: {{ formatDate(item.lastCompleted) }}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          @click="emit('completeToday')"
          :disabled="!canQuickComplete"
          :class="canQuickComplete ? 'flex-shrink-0 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow transition-all' : 'flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shadow transition-all cursor-not-allowed'"
          title="Complete today's quota"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <button
          @click="emit('logExercise')"
          class="flex-shrink-0 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white flex items-center justify-center shadow-lg transition-all touch-action-manipulation"
          title="Log exercise"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
      <button
        @click="emit('viewHistory')"
        class="text-sm text-gray-600 hover:text-primary-600 transition-colors"
      >
        View history
      </button>
      <span class="text-gray-300">|</span>
      <button
        @click="emit('edit')"
        class="text-sm text-gray-600 hover:text-primary-600 transition-colors"
      >
        Edit
      </button>
    </div>
  </div>
</template>
