<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Completion, TrackableWithStatus } from '@/types'
import { useTrackableStore } from '@/stores/trackable'
import { deleteCompletion } from '@/db'

const props = defineProps<{
  show: boolean
  item: TrackableWithStatus | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const store = useTrackableStore()
const completions = ref<Completion[]>([])
const loading = ref(false)

async function loadHistory() {
  if (!props.item?.id) return
  loading.value = true
  try {
    completions.value = await store.getHistory(props.item.id)
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (show) => {
  if (show && props.item) {
    loadHistory()
  }
})

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(date))
}

async function handleDeleteEntry(completionId: number | undefined) {
  if (completionId === undefined) {
    alert('Cannot delete: entry has no ID')
    return
  }
  if (!confirm('Delete this history entry?')) {
    return
  }
  try {
    await deleteCompletion(completionId)
    completions.value = completions.value.filter(c => c.id !== completionId)
    emit('updated')
  } catch (e) {
    console.error('Failed to delete:', e)
    alert('Failed to delete entry: ' + String(e))
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="emit('close')"
        ></div>
        
        <div class="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">
              {{ item?.name }} - History
            </h2>
            <button
              @click="emit('close')"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="loading" class="py-8 text-center text-gray-500">
            Loading...
          </div>
          
          <div v-else-if="completions.length === 0" class="py-8 text-center text-gray-500">
            No history yet. Mark this item as complete to start tracking!
          </div>
          
          <ul v-else class="space-y-2">
            <li
              v-for="completion in completions"
              :key="completion.id"
              class="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-900">
                    {{ formatDate(completion.completedAt) }}
                  </span>
                  <span 
                    v-if="completion.amount && item?.type === 'exercise'" 
                    class="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium"
                  >
                    {{ completion.amount }} {{ item?.exerciseUnit || 'reps' }}
                  </span>
                </div>
                <div v-if="completion.notes" class="text-sm text-gray-500 mt-0.5">
                  {{ completion.notes }}
                </div>
              </div>
              <button
                @click="handleDeleteEntry(completion.id)"
                class="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                title="Delete entry"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          </ul>
          
          <div class="mt-4 pt-4 border-t text-sm text-gray-500 text-center">
            <template v-if="item?.type === 'exercise'">
              Total: {{ completions.reduce((sum, c) => sum + (c.amount || 0), 0) }} {{ item?.exerciseUnit || 'reps' }} ({{ completions.length }} sessions)
            </template>
            <template v-else>
              Total completions: {{ completions.length }}
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .relative,
  .modal-leave-to .relative {
    transform: translateY(20px) scale(0.95);
  }
}
</style>
