<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTrackableStore } from '@/stores/trackable'
import { usePeopleStore } from '@/stores/people'
import ExerciseCard from '@/components/ExerciseCard.vue'
import TrackableForm from '@/components/TrackableForm.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import LogExerciseModal from '@/components/LogExerciseModal.vue'
import type { Trackable, TrackableWithStatus } from '@/types'

const store = useTrackableStore()
const peopleStore = usePeopleStore()

const showForm = ref(false)
const showHistory = ref(false)
const showLogModal = ref(false)
const editingItem = ref<Trackable | null>(null)
const historyItem = ref<TrackableWithStatus | null>(null)
const logItem = ref<TrackableWithStatus | null>(null)

onMounted(() => {
  store.loadTrackables('exercise', peopleStore.selectedPersonId)
})

watch(() => peopleStore.selectedPersonId, (newId) => {
  store.loadTrackables('exercise', newId)
})

function openAddForm() {
  editingItem.value = null
  showForm.value = true
}

function openEditForm(item: TrackableWithStatus) {
  editingItem.value = item
  showForm.value = true
}

function openHistory(item: TrackableWithStatus) {
  historyItem.value = item
  showHistory.value = true
}

function openLogModal(item: TrackableWithStatus) {
  logItem.value = item
  showLogModal.value = true
}

async function handleSave(data: Omit<Trackable, 'id' | 'createdAt' | 'archived'>) {
  if (editingItem.value?.id) {
    await store.updateTrackable(editingItem.value.id, data)
  } else {
    await store.addTrackable(data)
  }
  showForm.value = false
}

async function handleDelete() {
  console.log('handleDelete called, editingItem:', editingItem.value)
  if (editingItem.value?.id !== undefined) {
    console.log('Deleting trackable with id:', editingItem.value.id)
    await store.deleteTrackable(editingItem.value.id)
    console.log('Deleted trackable')
  } else {
    console.error('No id found on editingItem')
  }
  showForm.value = false
}

async function handleLogExercise(amount: number, notes?: string) {
  if (logItem.value?.id) {
    await store.markComplete(logItem.value.id, notes, amount)
  }
  showLogModal.value = false
}

const totalDebt = () => {
  return store.sortedTrackables.reduce((sum, t) => sum + (t.debt || 0), 0)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-900">💪 Exercises</h1>
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

    <!-- Person selector -->
    <div class="mb-6">
      <div class="flex gap-2">
        <button
          v-for="person in peopleStore.people"
          :key="person.id"
          @click="peopleStore.selectPerson(person.id)"
          class="flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          :class="peopleStore.selectedPersonId === person.id 
            ? 'bg-primary-600 text-white shadow-lg' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'"
        >
          <span class="text-xl">{{ person.emoji }}</span>
          <span>{{ person.name }}</span>
        </button>
      </div>
    </div>

    <!-- Total debt summary -->
    <div v-if="totalDebt() > 0" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div class="flex items-center gap-2 text-red-700">
        <span class="text-2xl">⚠️</span>
        <div>
          <p class="font-semibold">Exercise debt to pay off</p>
          <p class="text-sm">You have pending exercises - time to catch up!</p>
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      Loading...
    </div>

    <div v-else-if="store.sortedTrackables.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🏃</div>
      <p class="text-gray-500 mb-4">No exercises yet for {{ peopleStore.selectedPerson?.name }}.</p>
      <button
        @click="openAddForm"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        Add Exercise
      </button>
    </div>

    <div v-else class="space-y-4">
      <ExerciseCard
        v-for="item in store.sortedTrackables"
        :key="item.id"
        :item="item"
        @log-exercise="openLogModal(item)"
        @edit="openEditForm(item)"
        @view-history="openHistory(item)"
      />
    </div>

    <TrackableForm
      :show="showForm"
      type="exercise"
      :edit-item="editingItem"
      :person-id="peopleStore.selectedPersonId"
      @close="showForm = false"
      @save="handleSave"
      @delete="handleDelete"
    />

    <HistoryModal
      :show="showHistory"
      :item="historyItem"
      @close="showHistory = false"
      @updated="store.loadTrackables('exercise', peopleStore.selectedPersonId)"
    />

    <LogExerciseModal
      :show="showLogModal"
      :item="logItem"
      @close="showLogModal = false"
      @submit="handleLogExercise"
    />
  </div>
</template>
