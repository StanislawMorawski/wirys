<script setup lang="ts">
import { ref } from 'vue'
import type { TrackableWithStatus } from '@/types'
import { t } from '@/i18n'
import { getNow } from '@/dev/time'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  close: []
  edit: []
  viewHistory: []
  reschedule: [days: number]
  completePast: [daysAgo: number]
}>()

const showRescheduleInput = ref(false)
const rescheduleDays = ref(1)
const showPastCompletionInput = ref(false)
const daysAgo = ref(1)

function formatDate(date: Date | undefined): string {
  if (!date) return t('never')
  const now = getNow()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  
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

function handleReschedule() {
  emit('reschedule', rescheduleDays.value)
  showRescheduleInput.value = false
}

function handleCompletePast() {
  emit('completePast', daysAgo.value)
  showPastCompletionInput.value = false
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 class="text-2xl font-bold text-gray-900">{{ item.name }}</h2>
          <button
            @click="emit('close')"
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Description -->
          <div v-if="item.description" class="text-gray-600">
            {{ item.description }}
          </div>

          <!-- Status badges -->
          <div class="flex flex-wrap gap-2">
            <span v-if="item.isOverdue" class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {{ item.daysOverdue }} {{ t('overdue') }}
            </span>
            <span v-if="item.type === 'chore' && item.isRepeating === false" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {{ t('chore_type_singular') }}
            </span>
          </div>

          <!-- Due date info -->
          <div class="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <div class="text-lg font-semibold text-gray-900">
              📅 {{ getDaysUntilDue() }}
            </div>
            <div class="text-sm text-gray-600 mt-1">
              {{ formatDueDate(item.nextDue) }}
            </div>
          </div>

          <!-- Last completed -->
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ t('last_done') }}</span>
            <span class="font-medium text-gray-900">{{ formatDate(item.lastCompleted) }}</span>
          </div>

          <!-- Completion count -->
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ t('times') }}</span>
            <span class="font-medium text-gray-900">{{ item.completionCount }}</span>
          </div>

          <!-- Reschedule section -->
          <div v-if="showRescheduleInput" class="bg-gray-50 rounded-xl p-4 border border-gray-200">
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
                @click="showRescheduleInput = false"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {{ t('cancel') }}
              </button>
            </div>
          </div>

          <!-- Past completion section -->
          <div v-if="showPastCompletionInput" class="bg-green-50 rounded-xl p-4 border border-green-200">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('complete_past_days_ago') }}
            </label>
            <div class="flex gap-2">
              <input
                v-model.number="daysAgo"
                type="number"
                min="1"
                max="365"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                @click="handleCompletePast"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {{ t('save') }}
              </button>
              <button
                @click="showPastCompletionInput = false"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {{ t('cancel') }}
              </button>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-3">
            <button
              @click="showPastCompletionInput = !showPastCompletionInput"
              class="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ t('complete_past') }}
            </button>
            
            <button
              @click="showRescheduleInput = !showRescheduleInput"
              class="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ t('reschedule') }}
            </button>
            
            <button
              @click="emit('viewHistory')"
              class="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ t('view_history') }}
            </button>
            
            <button
              @click="emit('edit')"
              class="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {{ t('edit') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
