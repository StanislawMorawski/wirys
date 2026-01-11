<script setup lang="ts">
import type { TrackableWithStatus } from '@/types'
import { computed, ref } from 'vue'
import { getNow } from '@/dev/time'
import { t } from '@/i18n'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  complete: []
  uncomplete: []
  edit: []
  viewHistory: []
  reschedule: [days: number]
}>()

const showReschedule = ref(false)
const rescheduleDays = ref(1)

function formatDate(date: Date | undefined): string {
  if (!date) return t('never')

  const now = getNow()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) // full days difference

  if (diff === 0) return t('today')
  if (diff === 1) return t('yesterday')
  if (diff < 7) return `${diff} ${t('days_ago')}`
  if (diff < 30) {
    const weeks = Math.floor(diff / 7)
    return `${weeks} ${t('weeks_ago')}`
  }
  const months = Math.floor(diff / 30)
  return `${months} ${t('months_ago')}`
}

function formatDueDate(date: Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  }).format(d)
}

function getDaysUntilDue(): string {
  if (!props.item.nextDue) return ''
  const now = getNow()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = new Date(props.item.nextDue)
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return `${Math.abs(diff)} ${t('days_overdue_short')}`
  if (diff === 0) return t('due_today')
  if (diff === 1) return t('due_tomorrow')
  return `${t('due_in')} ${diff} ${t('days')}`
}

function formatRecurrence(item: TrackableWithStatus): string {
  const { every, unit } = item.recurrence
  const pluralKey = `unit_${unit}`
  const singularKey = `unit_${unit.slice(0, -1)}_singular`
  if (every === 1) {
    return `${t('every')} ${t(singularKey)}`
  }
  return `${t('every')} ${every} ${t(pluralKey)}`
}

const isSingularChore = computed(() => {
  return props.item.type === 'chore' && props.item.isRepeating === false
})

const isCompletedSingular = computed(() => {
  return isSingularChore.value && props.item.lastCompleted !== undefined
})

const statusColor = computed(() => {
  if (isCompletedSingular.value) return 'bg-gray-50 border-gray-200 opacity-60'
  if (props.item.isOverdue && props.item.daysOverdue > 0) return 'bg-red-50 border-red-200'
  if (isDueToday.value) return 'bg-yellow-50 border-yellow-200'
  return 'bg-white border-gray-200'
})

const isDueToday = computed(() => {
  if (!props.item.nextDue) return false
  const now = getNow()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = new Date(props.item.nextDue)
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  return today.getTime() === due.getTime()
})

const isDueSoon = computed(() => {
  if (!props.item.nextDue || isDueToday.value) return false
  const now = getNow()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = new Date(props.item.nextDue)
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 && diff <= 7
})

const canUndo = computed(() => {
  if (!props.item.lastCompleted) return false
  
  const now = getNow()
  const completed = new Date(props.item.lastCompleted)
  
  // Check if it's the same calendar day
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const completedDay = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate())
  const isSameDay = nowDay.getTime() === completedDay.getTime()
  
  // For one-time tasks, only allow undo if completed today
  if (isSingularChore.value) return isSameDay
  
  // For repeating tasks, check time constraints
  // Check if less than 12 hours have passed
  const hoursSinceComplete = (now.getTime() - completed.getTime()) / (1000 * 60 * 60)
  const withinTimeWindow = hoursSinceComplete < 12
  
  // Both conditions must be true to allow undo for repeating tasks
  return isSameDay && withinTimeWindow
})

const statusBadge = computed(() => {
  if (isCompletedSingular.value) {
    return {
      text: t('done_label'),
      class: 'bg-green-100 text-green-700'
    }
  }
  if (props.item.isOverdue && props.item.daysOverdue > 0) {
    return {
      text: `${props.item.daysOverdue} ${t('overdue')}`,
      class: 'bg-red-100 text-red-700'
    }
  }
  if (isDueToday.value) {
    return {
      text: t('due_today'),
      class: 'bg-yellow-100 text-yellow-700'
    }
  }
  return null
})

function handleReschedule() {
  emit('reschedule', rescheduleDays.value)
  showReschedule.value = false
}

function handleToggleComplete() {
  if (canUndo.value) {
    emit('uncomplete')
  } else {
    emit('complete')
  }
}
</script>

<template>
  <div
    class="rounded-xl border p-4 shadow-sm transition-all cursor-pointer hover:shadow-md"
    :class="[
      statusColor,
      isDueSoon ? 'ring-2 ring-yellow-300' : ''
    ]"
    @click="emit('viewHistory')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-gray-900 truncate" :class="{ 'line-through': isCompletedSingular }">
            {{ item.name }}
          </h3>
          <span
            v-if="statusBadge"
            class="text-xs px-2 py-0.5 rounded-full font-medium"
            :class="statusBadge.class"
          >
            {{ statusBadge.text }}
          </span>
          <span v-if="isSingularChore" class="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
            {{ t('chore_type_singular') }}
          </span>
        </div>
        
        <p v-if="item.description" class="text-sm text-gray-600 mt-1 line-clamp-2">
          {{ item.description }}
        </p>
        
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span v-if="!isSingularChore" class="flex items-center gap-1">
            <span>🔄</span>
            {{ formatRecurrence(item) }}
          </span>
          <span class="flex items-center gap-1">
            <span>✓</span>
            {{ item.completionCount }} {{ t('times') }}
          </span>
        </div>
        
        <div class="mt-2 space-y-1">
          <div class="text-sm font-medium text-gray-700">
            📅 {{ getDaysUntilDue() }}
          </div>
          <div class="text-xs text-gray-500">
            {{ formatDueDate(item.nextDue) }}
          </div>
        </div>
        
        <div class="text-sm text-gray-500 mt-1">
          {{ t('last_done') }} {{ formatDate(item.lastCompleted) }}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Reschedule button - always show -->
        <button
          @click.stop="showReschedule = !showReschedule"
          class="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md transition-all touch-action-manipulation"
          :title="t('reschedule')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        <!-- Complete/Undo button - show for incomplete tasks OR tasks that can be undone -->
        <button
          v-if="!isCompletedSingular || canUndo"
          @click.stop="handleToggleComplete"
          class="flex-shrink-0 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg transition-all touch-action-manipulation"
          :class="canUndo ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'"
          :title="canUndo ? t('undo') : t('mark_done')"
        >
          <!-- Undo icon (circular arrow) -->
          <svg v-if="canUndo" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <!-- Checkmark for incomplete -->
          <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
    
    <div v-if="showReschedule" @click.stop class="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('days_from_now') }}
      </label>
      <div class="flex gap-2">
        <input
          v-model.number="rescheduleDays"
          type="number"
          min="0"
          max="365"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          @click="handleReschedule"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {{ t('save') }}
        </button>
        <button
          @click="showReschedule = false"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {{ t('cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
