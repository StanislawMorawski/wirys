<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { t } from '@/i18n'
import type { Completion, TrackableWithStatus } from '@/types'
import { useTrackableStore } from '@/stores/trackable'
import { deleteCompletion } from '@/db'
import CalendarGrid from '@/components/CalendarGrid.vue'
import { getNow } from '@/dev/time'

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
const view = ref<'list'|'calendar'>('list')
const selectedDay = ref<string | null>(null)

const calendarEvents = computed(() => {
  return completions.value.map(c => ({ date: toDateKey(c.completedAt), payload: { name: props.item?.name, trackableName: props.item?.name, amount: c.amount, notes: c.notes } }))
})

const highlightDates = computed(() => {
  const s = new Set<string>()
  for (const c of completions.value) s.add(toDateKey(c.completedAt))
  return Array.from(s)
})

const calendarYear = computed(() => {
  if (completions.value.length === 0) return getNow().getFullYear()
  const d = new Date(completions.value[0].completedAt)
  return d.getFullYear()
})

const calendarMonth = computed(() => {
  if (completions.value.length === 0) return getNow().getMonth()
  const d = new Date(completions.value[0].completedAt)
  return d.getMonth()
})

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
  } else if (!show) {
    // Clear transient state when modal closes to avoid stale references
    completions.value = []
    selectedDay.value = null
  }
})

// Close modal on global navigation to avoid Teleport/Transition parentNode issues
import { onMounted, onBeforeUnmount } from 'vue'

function handleNavigate() {
  // Defer close to next tick to avoid update-time DOM issues
  setTimeout(() => emit('close'), 0)
}

onMounted(() => {
  window.addEventListener('wirys:navigate', handleNavigate)
})

onBeforeUnmount(() => {
  window.removeEventListener('wirys:navigate', handleNavigate)
})



// Also clear state if the item changes while open
watch(() => props.item, (it) => {
  if (props.show && it) loadHistory()
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

function toDateKey(date: Date | string) {
  const d = new Date(date)
  return d.toISOString().slice(0,10)
}

async function handleDeleteEntry(completionId: number | undefined) {
  if (completionId === undefined) {
    alert(t('delete_no_id'))
    return
  }
  if (!confirm(t('delete_entry_confirm'))) {
    return
  }
  try {
    await deleteCompletion(completionId)
    completions.value = completions.value.filter(c => c.id !== completionId)
    emit('updated')
  } catch (e) {
    console.error('Failed to delete:', e)
    alert(t('delete_entry_failed') + String(e))
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
              {{ item?.name }} - {{ t('history_title') }}
            </h2>
            <div class="flex items-center gap-2">
              <button
                :class="view === 'list' ? 'bg-primary-600 text-white px-3 py-1 rounded' : 'px-3 py-1 rounded border'
                "
                @click="view = 'list'"
              >
                {{ t('history_list') }}
              </button>
              <button
                :class="view === 'calendar' ? 'bg-primary-600 text-white px-3 py-1 rounded' : 'px-3 py-1 rounded border'"
                @click="view = 'calendar'"
              >
                {{ t('history_calendar') }}
              </button>
              <button
                @click="emit('close')"
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="loading" class="py-8 text-center text-gray-500">
            {{ t('loading') }}
          </div>
          
          <div v-else-if="completions.length === 0 && view === 'list'" class="py-8 text-center text-gray-500">
            {{ t('history_no_entries') }}
          </div>

          <div v-if="view === 'list'">
            <ul v-if="completions.length > 0" class="space-y-2">
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
                  :title="t('delete_entry')"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="view === 'calendar' && item">
              <div class="text-xs text-gray-500 mb-2">{{ t('events_this_item').replace('{count}', String(calendarEvents.length)).replace('{year}', String(calendarYear)).replace('{month}', String(calendarMonth)) }}</div>
              <CalendarGrid :events="calendarEvents" :highlight-dates="highlightDates" :year="calendarYear" :month="calendarMonth" @dayClick="selectedDay = $event" />

              <div v-if="selectedDay" class="mt-4">
                <div class="font-semibold mb-2">{{ t('entries_on') }} {{ formatDate(new Date(selectedDay)) }}</div>
                <ul class="space-y-2">
                  <li v-for="c in completions.filter(x => toDateKey(x.completedAt) === selectedDay)" :key="c.id" class="py-2 px-3 bg-gray-50 rounded">
                    <div class="flex justify-between items-center">
                      <div>
                        <div class="text-sm font-medium">{{ formatDate(c.completedAt) }}</div>
                        <div v-if="c.amount" class="text-xs text-gray-600">{{ c.amount }} {{ item?.exerciseUnit }}</div>
                        <div v-if="c.notes" class="text-xs text-gray-600">{{ c.notes }}</div>
                      </div>
                      <button @click="handleDeleteEntry(c.id)" class="text-red-500">{{ t('delete') }}</button>
                    </div>
                  </li>
                </ul>
              </div>

              <div v-if="(calendarEvents || []).length === 0" class="text-center text-gray-500 py-6">{{ t('no_entries_month') }}</div>
            </div>
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
