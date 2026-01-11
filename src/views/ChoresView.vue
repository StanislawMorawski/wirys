<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTrackableStore } from '@/stores/trackable'
import { db, getAllCompletions } from '@/db'
import { getNow } from '@/dev/time'
import TrackableCard from '@/components/TrackableCard.vue'
import TrackableForm from '@/components/TrackableForm.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import CalendarGrid from '@/components/CalendarGrid.vue'
import SyncButton from '@/components/SyncButton.vue'
import ChoreDetailModal from '@/components/ChoreDetailModal.vue'
import { t } from '@/i18n'
import type { Trackable, TrackableWithStatus } from '@/types' 
const store = useTrackableStore()

const showForm = ref(false)
const showHistory = ref(false)
const showCalendar = ref(false)
const showDetail = ref(false)
const detailItem = ref<TrackableWithStatus | null>(null)
const calLoading = ref(false)
const calendarEvents = ref<Array<{ date: string; payload?: any }>>([])
const selectedCalDay = ref<string | null>(null)
const dayEntries = ref<any[]>([])
const editingItem = ref<Trackable | null>(null)
const historyItem = ref<TrackableWithStatus | null>(null)

function handleSynced() {
  store.loadTrackables('chore')
}

onMounted(() => {
  store.loadTrackables('chore')
})

import { onBeforeRouteLeave } from 'vue-router'

onBeforeRouteLeave((_to, _from, next) => {
  // ensure any floating modals are closed before navigating away
  showCalendar.value = false
  showForm.value = false
  showHistory.value = false
  next()
})

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
    const trackableMap = new Map(chores.map(c => [c.id!, { name: c.name, nextDue: c.nextDueDate }]))

    // Past completions
    const filtered = completions.filter(c => choreIds.has(c.trackableId))
    const completionEvents = filtered.map(c => ({ 
      date: new Date(c.completedAt).toISOString().slice(0,10), 
      payload: { 
        type: 'completion',
        trackableName: trackableMap.get(c.trackableId)?.name,
        time: new Date(c.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        notes: c.notes 
      } 
    }))
    
    // Upcoming due dates
    const upcomingEvents = chores
      .filter(c => c.nextDueDate && !c.archived)
      .map(c => ({
        date: new Date(c.nextDueDate!).toISOString().slice(0,10),
        payload: {
          type: 'upcoming',
          trackableName: c.name
        }
      }))
    
    calendarEvents.value = [...completionEvents, ...upcomingEvents]
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
  // Get the events for this day from calendarEvents
  dayEntries.value = calendarEvents.value
    .filter(e => e.date === date)
    .map(e => e.payload)
}

function openEditForm(item: TrackableWithStatus) {
  editingItem.value = item
  showForm.value = true
}



function openHistory(item: TrackableWithStatus) {
  historyItem.value = item
  showHistory.value = true
  showDetail.value = false
}

function openDetail(item: TrackableWithStatus) {
  detailItem.value = item
  showDetail.value = true
}

function handleDetailEdit() {
  if (detailItem.value) {
    editingItem.value = detailItem.value as Trackable
    showDetail.value = false
    showForm.value = true
  }
}

function handleDetailHistory() {
  if (detailItem.value) {
    openHistory(detailItem.value)
  }
}

function handleDetailReschedule(days: number) {
  if (detailItem.value) {
    handleReschedule(detailItem.value, days)
    showDetail.value = false
  }
}

async function handleDetailCompletePast(daysAgo: number) {
  if (detailItem.value) {
    await store.markCompletePast(detailItem.value.id!, daysAgo)
    showDetail.value = false
  }
}

async function handleDetailDelete() {
  if (detailItem.value && confirm(`Delete "${detailItem.value.name}"?`)) {
    await store.deleteTrackable(detailItem.value.id!)
    showDetail.value = false
  }
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
}

async function handleUncomplete(item: TrackableWithStatus) {
  await store.uncompleteTrackable(item.id!)
}

async function handleReschedule(item: TrackableWithStatus, days: number) {
  const now = getNow()
  const nextDue = new Date(now)
  nextDue.setDate(nextDue.getDate() + days)
  
  // For one-time tasks, clear the completion status when rescheduling
  const isOneTime = item.type === 'chore' && item.isRepeating === false
  if (isOneTime) {
    // Delete all completions for this one-time task
    await db.completions.where('trackableId').equals(item.id!).delete()
    await store.updateTrackable(item.id!, { nextDueDate: nextDue, lastCompleted: undefined })
  } else {
    await store.updateTrackable(item.id!, { nextDueDate: nextDue })
  }
  
  // Reload to reflect changes in UI
  await store.loadTrackables('chore', undefined)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex gap-2">
        <button
          @click="openCalendar"
          class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V11a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {{ t('calendar') }}
        </button>

        <div class="flex items-center gap-2">
          <button
            @click="openAddForm"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('add') }}
          </button>

          <SyncButton @synced="handleSynced" />
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      {{ t('loading') }}
    </div>

    <div v-else-if="store.sortedTrackables.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🧹</div>
      <p class="text-gray-500 mb-4">{{ t('history_no_entries') }}</p>
      <button
        @click="openAddForm"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        {{ t('add_chore') }}
      </button>
    </div>
    <template v-else>
      <div class="space-y-4">
        <TrackableCard
          v-for="item in store.sortedTrackables"
          :key="item.id"
          :item="item"
          @complete="handleComplete(item)"
          @uncomplete="handleUncomplete(item)"
          @reschedule="(days) => handleReschedule(item, days)"
          @edit="openEditForm(item)"
          @view-history="openDetail(item)"
        />
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
      @updated="store.loadTrackables('chore')"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCalendar" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeCalendar"></div>
          <div class="relative bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900">{{ t('chores_calendar') }}</h2>
              <button @click="closeCalendar" class="text-gray-400 hover:text-gray-600">{{ t('close') }}</button>
            </div>

            <div v-if="calLoading" class="py-8 text-center text-gray-500">{{ t('loading') }}</div>
            <div v-else>
              <CalendarGrid :events="calendarEvents" @dayClick="onCalDayClick" />

              <div v-if="selectedCalDay" class="mt-4">
                <div class="font-semibold mb-2">{{ t('entries_on') }} {{ selectedCalDay }}</div>
                <ul class="space-y-2">
                  <li v-for="(entry, idx) in dayEntries" :key="idx" class="py-2 px-3 bg-gray-50 rounded">
                    <div class="flex items-center gap-2">
                      <span v-if="entry.type === 'completion'">✓</span>
                      <span v-else>📅</span>
                      <div class="flex-1">
                        <div class="text-sm font-medium">{{ entry.trackableName }}</div>
                        <div v-if="entry.time" class="text-xs text-gray-600">{{ entry.time }}</div>
                        <div v-if="entry.notes" class="text-xs text-gray-600 mt-1">{{ entry.notes }}</div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <div v-if="calendarEvents.length === 0" class="text-center text-gray-500 py-6">{{ t('no_entries_month') }}</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Chore Detail Modal -->
    <ChoreDetailModal
      v-if="showDetail && detailItem"
      :item="detailItem"
      @close="showDetail = false"
      @edit="handleDetailEdit"
      @view-history="handleDetailHistory"
      @reschedule="handleDetailReschedule"
      @complete-past="handleDetailCompletePast"
      @delete="handleDetailDelete"
    />
  </div>
</template>
