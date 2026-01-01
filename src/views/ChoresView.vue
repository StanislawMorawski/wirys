<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTrackableStore } from '@/stores/trackable'
import { db, getAllCompletions } from '@/db'
import { getNow } from '@/dev/time'
import TrackableCard from '@/components/TrackableCard.vue'
import TrackableForm from '@/components/TrackableForm.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import CalendarGrid from '@/components/CalendarGrid.vue'
import type { Trackable, TrackableWithStatus, Completion } from '@/types'

const store = useTrackableStore()

const showForm = ref(false)
const showHistory = ref(false)
const showRecentHistory = ref(false)
const showCalendar = ref(false)
const calLoading = ref(false)
const calendarEvents = ref<Array<{ date: string; payload?: any }>>([])
const selectedCalDay = ref<string | null>(null)
const dayEntries = ref<any[]>([])
const editingItem = ref<Trackable | null>(null)
const historyItem = ref<TrackableWithStatus | null>(null)
const recentCompletions = ref<(Completion & { trackableName?: string })[]>([])

onMounted(() => {
  store.loadTrackables('chore')
  loadRecentHistory()
})

async function loadRecentHistory() {
  const completions = await db.completions.reverse().sortBy('completedAt')
  const trackables = await db.trackables.where('type').equals('chore').toArray()
  const trackableMap = new Map(trackables.map(t => [t.id!, t.name]))
  
  recentCompletions.value = completions
    .filter(c => trackableMap.has(c.trackableId))
    .slice(0, 20)
    .map(c => ({
      ...c,
      trackableName: trackableMap.get(c.trackableId)
    }))
}

function openAddForm() {
  editingItem.value = null
  showForm.value = true
}

async function openCalendar() {
  calLoading.value = true
  try {
    const completions = await getAllCompletions()
    const chores = await db.trackables.where('type').equals('chore').toArray()
    const choreIds = new Set(chores.map(c => c.id))
    const trackableMap = new Map(chores.map(c => [c.id, c.name]))

    const filtered = completions.filter(c => choreIds.has(c.trackableId))
    calendarEvents.value = filtered.map(c => ({ date: new Date(c.completedAt).toISOString().slice(0,10), payload: { trackableName: trackableMap.get(c.trackableId), notes: c.notes } }))
  } finally {
    calLoading.value = false
    showCalendar.value = true
  }
}

function closeCalendar() {
  showCalendar.value = false
  calendarEvents.value = []
  selectedCalDay.value = null
  dayEntries.value = []
}

function onCalDayClick(date: string) {
  selectedCalDay.value = date
  getAllCompletions().then(all => {
    const chores = all.filter(c => new Date(c.completedAt).toISOString().slice(0,10) === date && c.trackableId)
    dayEntries.value = chores
  })
}

function openEditForm(item: TrackableWithStatus) {
  editingItem.value = item
  showForm.value = true
}

function openHistory(item: TrackableWithStatus) {
  historyItem.value = item
  showHistory.value = true
}

async function handleSave(data: Omit<Trackable, 'id' | 'createdAt' | 'archived'>) {
  if (editingItem.value?.id) {
    await store.updateTrackable(editingItem.value.id, data)
  } else {
    await store.addTrackable(data)
  }
  showForm.value = false
}

async function handleDelete(id?: number) {
  console.log('handleDelete called, id param:', id, 'editingItem:', editingItem.value)
  const idToDelete = (id && id > 0) ? id : editingItem.value?.id
  if (idToDelete !== undefined) {
    console.log('Deleting trackable with id:', idToDelete)
    await store.deleteTrackable(idToDelete)
    console.log('Deleted trackable')
  } else {
    console.error('No id found to delete')
  }
  showForm.value = false
}

async function handleComplete(item: TrackableWithStatus) {
  await store.markComplete(item.id!)
  await loadRecentHistory()
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = getNow()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days} days ago`
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">🏠 Chores</h1>
      <div class="flex gap-2">
        <button
          @click="openCalendar"
          class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V11a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Calendar
        </button>

        <button
          @click="openAddForm"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      Loading...
    </div>

    <div v-else-if="store.sortedTrackables.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🧹</div>
      <p class="text-gray-500 mb-4">No chores yet. Add your first one!</p>
      <button
        @click="openAddForm"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        Add Chore
      </button>
    </div>

    <template v-else>
      <div class="space-y-4">
        <TrackableCard
          v-for="item in store.sortedTrackables"
          :key="item.id"
          :item="item"
          @complete="handleComplete(item)"
          @edit="openEditForm(item)"
          @view-history="openHistory(item)"
        />
      </div>

      <!-- Recent History Section -->
      <div v-if="recentCompletions.length > 0" class="mt-8">
        <button
          @click="showRecentHistory = !showRecentHistory"
          class="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg 
            class="w-4 h-4 transition-transform" 
            :class="showRecentHistory ? 'rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Recent History ({{ recentCompletions.length }})
        </button>
        
        <div v-if="showRecentHistory" class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div
            v-for="completion in recentCompletions"
            :key="completion.id"
            class="flex items-center justify-between px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <span class="text-green-500">✓</span>
              <span class="font-medium text-gray-900">{{ completion.trackableName }}</span>
            </div>
            <span class="text-sm text-gray-500">{{ formatDate(completion.completedAt) }}</span>
          </div>
        </div>
      </div>
    </template>

    <TrackableForm
      :show="showForm"
      type="chore"
      :edit-item="editingItem"
      @close="showForm = false"
      @save="handleSave"
      @delete-item="handleDelete"
    />

    <HistoryModal
      :show="showHistory"
      :item="historyItem"
      @close="showHistory = false"
      @updated="store.loadTrackables('chore'); loadRecentHistory()"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCalendar" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeCalendar"></div>
          <div class="relative bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900">Chores Calendar</h2>
              <button @click="closeCalendar" class="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <div v-if="calLoading" class="py-8 text-center text-gray-500">Loading...</div>
            <div v-else>
              <div class="text-xs text-gray-500 mb-2">Chore completions this month: {{ calendarEvents.length }}</div>
              <CalendarGrid :events="calendarEvents" @dayClick="onCalDayClick" />

              <div v-if="selectedCalDay" class="mt-4">
                <div class="font-semibold mb-2">Entries on {{ selectedCalDay }}</div>
                <ul class="space-y-2">
                  <li v-for="e in dayEntries" :key="e.id" class="py-2 px-3 bg-gray-50 rounded">
                    <div class="text-sm font-medium">{{ new Date(e.completedAt).toLocaleString() }}</div>
                    <div class="text-xs text-gray-600">{{ e.notes }}</div>
                  </li>
                </ul>
              </div>

              <div v-if="calendarEvents.length === 0" class="text-center text-gray-500 py-6">No entries in this month.</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
