<script setup lang="ts">
import type { TrackableWithStatus } from '@/types'
import { computed } from 'vue'
import { getNow } from '@/dev/time'
import { t } from '@/i18n'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  complete: []
  edit: []
  viewHistory: []
}>()

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

function formatRecurrence(item: TrackableWithStatus): string {
  const { every, unit } = item.recurrence
  const pluralKey = `unit_${unit}`
  const singularKey = `unit_${unit.slice(0, -1)}_singular`
  if (every === 1) {
    return `${t('every')} ${t(singularKey)}`
  }
  return `${t('every')} ${every} ${t(pluralKey)}`
}

const statusColor = computed(() => {
  if (props.item.isOverdue) return 'bg-red-50 border-red-200'
  if (!props.item.lastCompleted) return 'bg-yellow-50 border-yellow-200'
  return 'bg-white border-gray-200'
})

const statusBadge = computed(() => {
  if (props.item.isOverdue) {
    return {
      text: `${props.item.daysOverdue} ${t('overdue')}`,
      class: 'bg-red-100 text-red-700'
    }
  }
  if (!props.item.lastCompleted) {
    return {
      text: t('never_done'),
      class: 'bg-yellow-100 text-yellow-700'
    }
  }
  return null
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
            v-if="statusBadge"
            class="text-xs px-2 py-0.5 rounded-full font-medium"
            :class="statusBadge.class"
          >
            {{ statusBadge.text }}
          </span>
        </div>
        
        <p v-if="item.description" class="text-sm text-gray-600 mt-1 line-clamp-2">
          {{ item.description }}
        </p>
        
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span class="flex items-center gap-1">
            <span>🔄</span>
            {{ formatRecurrence(item) }}
          </span>
          <span class="flex items-center gap-1">
            <span>✓</span>
            {{ item.completionCount }} {{ t('times') }}
          </span>
        </div>
        
        <div class="text-sm text-gray-500 mt-1">
          {{ t('last_done') }} {{ formatDate(item.lastCompleted) }}
        </div>
      </div>
      
      <button
        @click="emit('complete')"
        class="flex-shrink-0 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white flex items-center justify-center shadow-lg transition-all touch-action-manipulation"
        :title="t('mark_done')"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
    
    <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
      <button
        @click="emit('viewHistory')"
        class="text-sm text-gray-600 hover:text-primary-600 transition-colors"
      >
        {{ t('view_history') }}
      </button>
      <span class="text-gray-300">|</span>
      <button
        @click="emit('edit')"
        class="text-sm text-gray-600 hover:text-primary-600 transition-colors"
      >
        {{ t('edit') }}
      </button>
    </div>
  </div>
</template>
