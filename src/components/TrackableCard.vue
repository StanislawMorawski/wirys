<script setup lang="ts">
import type { TrackableWithStatus } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  complete: []
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
  if (every === 1) {
    return `Every ${unit.slice(0, -1)}`
  }
  return `Every ${every} ${unit}`
}

const statusColor = computed(() => {
  if (props.item.isOverdue) return 'bg-red-50 border-red-200'
  if (!props.item.lastCompleted) return 'bg-yellow-50 border-yellow-200'
  return 'bg-white border-gray-200'
})

const statusBadge = computed(() => {
  if (props.item.isOverdue) {
    return {
      text: `${props.item.daysOverdue}d overdue`,
      class: 'bg-red-100 text-red-700'
    }
  }
  if (!props.item.lastCompleted) {
    return {
      text: 'Never done',
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
            {{ item.completionCount }} times
          </span>
        </div>
        
        <div class="text-sm text-gray-500 mt-1">
          Last done: {{ formatDate(item.lastCompleted) }}
        </div>
      </div>
      
      <button
        @click="emit('complete')"
        class="flex-shrink-0 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white flex items-center justify-center shadow-lg transition-all touch-action-manipulation"
        title="Mark as done"
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
