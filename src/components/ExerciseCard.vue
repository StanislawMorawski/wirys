<script setup lang="ts">
import type { TrackableWithStatus } from '@/types'
import { computed } from 'vue'
import { t } from '@/i18n'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  logExercise: []
  completeToday: []
  edit: []
  viewHistory: []
  click: []
}>()

function formatRecurrence(item: TrackableWithStatus): string {
  const { every, unit } = item.recurrence
  const target = item.targetAmount || 0
  // Translate the unit labels (e.g., 'reps', 'km') using i18n keys like unit_reps, unit_km
  const exerciseUnitKey = `unit_${item.exerciseUnit || 'reps'}`
  const exerciseUnitLabel = t(exerciseUnitKey)
  const pluralUnitKey = `unit_${unit}`
  const singularUnitKey = `unit_${unit.slice(0, -1)}_singular`
  const periodLabel = every === 1 ? t(singularUnitKey) : t(pluralUnitKey)
  return `${target} ${exerciseUnitLabel} / ${every === 1 ? periodLabel : `${every} ${periodLabel}`}`
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
  const unitKey = `unit_${props.item.exerciseUnit || 'reps'}`
  return `${debt} ${t(unitKey)}`
})

const advanceDisplay = computed(() => {
  const advance = props.item.advanceAmount || 0
  const unitKey = `unit_${props.item.exerciseUnit || 'reps'}`
  return `${advance} ${t(unitKey)}`
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
    class="rounded-xl border p-4 shadow-sm transition-all cursor-pointer hover:shadow-md"
    :class="statusColor"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-gray-900 truncate">{{ item.name }}</h3>
          <span
            v-if="item.debt && item.debt > 0"
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700"
          >
            {{ t('debt_label') }} {{ debtDisplay }}
          </span>
          <template v-else-if="isTodayDone">
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700"
            >
              {{ t('done_label') }}
            </span>
            <span
              v-if="item.advanceAmount && item.advanceAmount > 0"
              class="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700"
            >
              +{{ advanceDisplay }} {{ t('ahead_label') }}
            </span>
          </template>
          <span
            v-else
            class="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700"
          >
            {{ t('todo_label') }}
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
            {{ item.totalCompleted || 0 }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }} {{ t('total_label') }}
          </span>
        </div>
        
        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span v-if="item.monthlyCompletions !== undefined">
            📅 {{ item.monthlyCompletions }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }} {{ t('this_month') }}
          </span>
          <span v-if="item.yearlyCompletions !== undefined">
            🗓️ {{ item.yearlyCompletions }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }} {{ t('this_year') }}
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
              {{ item.debt }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }} {{ t('debt_from_past') }}
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
              {{ t('today_label') }} {{ item.currentPeriodDone || 0 }}/{{ item.currentPeriodTarget || item.targetAmount }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }}
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
                {{ t('today_label') }} {{ item.currentPeriodDone || 0 }}/{{ item.currentPeriodTarget || item.targetAmount }} {{ t('unit_' + (item.exerciseUnit || 'reps')) }}
              </span>
              <span v-if="advanceProgressPercent > 0" class="text-blue-600">
                +{{ item.advanceAmount }} {{ t('ahead_label') }}
              </span>
              <span v-else-if="item.canDoAdvance && todayProgressPercent >= 100" class="text-blue-600">
                {{ t('all_caught_up') }}
              </span>
            </div>
          </template>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          @click.stop="emit('completeToday')"
          :disabled="!canQuickComplete"
          :class="canQuickComplete ? 'flex-shrink-0 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow transition-all' : 'flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shadow transition-all cursor-not-allowed'"
          :title="t('completeToday')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <button
          @click.stop="emit('logExercise')"
          class="flex-shrink-0 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white flex items-center justify-center shadow-lg transition-all touch-action-manipulation"
          :title="t('logExercise')"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
