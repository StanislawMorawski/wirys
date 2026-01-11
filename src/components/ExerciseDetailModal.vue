<script setup lang="ts">
import { computed } from 'vue'
import type { TrackableWithStatus } from '@/types'
import { t } from '@/i18n'

const props = defineProps<{
  item: TrackableWithStatus
}>()

const emit = defineEmits<{
  close: []
  edit: []
  viewHistory: []
}>()

function formatRecurrence(item: TrackableWithStatus): string {
  const { every, unit } = item.recurrence
  const target = item.targetAmount || 0
  const exerciseUnitKey = `unit_${item.exerciseUnit || 'reps'}`
  const exerciseUnitLabel = t(exerciseUnitKey)
  const pluralUnitKey = `unit_${unit}`
  const singularUnitKey = `unit_${unit.slice(0, -1)}_singular`
  const periodLabel = every === 1 ? t(singularUnitKey) : t(pluralUnitKey)
  return `${target} ${exerciseUnitLabel} / ${every === 1 ? periodLabel : `${every} ${periodLabel}`}`
}

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
            <span v-if="item.debt && item.debt > 0" class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {{ t('debt_label') }} {{ debtDisplay }}
            </span>
            <span v-else-if="item.advanceAmount && item.advanceAmount > 0" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              +{{ advanceDisplay }} {{ t('ahead_label') }}
            </span>
            <span v-else class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {{ t('done_label') }}
            </span>
          </div>

          <!-- Target info -->
          <div class="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div class="text-lg font-semibold text-gray-900">
              🎯 {{ formatRecurrence(item) }}
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-sm text-gray-500">{{ t('total_label') }}</div>
              <div class="text-2xl font-bold text-gray-900">
                {{ item.totalCompleted || 0 }}
                <span class="text-sm text-gray-500 ml-1">{{ t('unit_' + (item.exerciseUnit || 'reps')) }}</span>
              </div>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="text-sm text-gray-500">{{ t('this_month') }}</div>
              <div class="text-2xl font-bold text-gray-900">
                {{ item.monthlyCompletions || 0 }}
                <span class="text-sm text-gray-500 ml-1">{{ t('unit_' + (item.exerciseUnit || 'reps')) }}</span>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-3">
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
