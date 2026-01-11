<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { t } from '@/i18n'
import { useTrackableStore } from '@/stores/trackable'
import { usePeopleStore } from '@/stores/people'
import ExerciseCard from '@/components/ExerciseCard.vue'
import TrackableForm from '@/components/TrackableForm.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import LogExerciseModal from '@/components/LogExerciseModal.vue'
import ExerciseDetailModal from '@/components/ExerciseDetailModal.vue'
import SyncButton from '@/components/SyncButton.vue'
import type { Trackable, TrackableWithStatus } from '@/types'

const store = useTrackableStore()
const peopleStore = usePeopleStore()

const showForm = ref(false)
const showHistory = ref(false)
const showLogModal = ref(false)
const showDetail = ref(false)
const editingItem = ref<Trackable | null>(null)
const historyItem = ref<TrackableWithStatus | null>(null)
const logItem = ref<TrackableWithStatus | null>(null)
const detailItem = ref<TrackableWithStatus | null>(null)

function handleSynced() {
  store.loadTrackables('exercise', peopleStore.selectedPersonId)
}

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

async function handleDetailDelete() {
  if (detailItem.value && confirm(`Delete "${detailItem.value.name}"?`)) {
    await store.deleteTrackable(detailItem.value.id!)
    showDetail.value = false
  }
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

async function handleLogExercise(amount: number, notes?: string) {
  if (logItem.value?.id) {
    await store.markComplete(logItem.value.id, notes, amount)
  }
  showLogModal.value = false
}

async function handleQuickComplete(item: TrackableWithStatus) {
  const target = item.currentPeriodTarget || item.targetAmount || 0
  const done = item.currentPeriodDone || 0
  const currentAdvance = item.advanceAmount || 0
  let toComplete = 0

  if (done < target) {
    // finish today's quota
    toComplete = target - done
  } else {
    // today's quota already complete -> add remaining to fill the advance up to one full quota
    const remainingAdvance = Math.max(0, target - currentAdvance)
    toComplete = remainingAdvance
  }

  console.log('Quick complete', item.id, toComplete)
  if (item.id !== undefined && toComplete > 0) {
    await store.markComplete(item.id, undefined, toComplete)
  }
}

const totalDebt = () => {
  return store.sortedTrackables.reduce((sum, t) => sum + (t.debt || 0), 0)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div></div>
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

    <!-- Current person info (selection moved to Settings) -->
    <div class="mb-4 text-sm text-gray-500">
      {{ t('people_showing_for').replace('{name}', peopleStore.selectedPerson?.name || '') }}
    </div>

    <!-- Total debt summary -->
    <div v-if="totalDebt() > 0" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div class="flex items-center gap-2 text-red-700">
        <span class="text-2xl">⚠️</span>
        <div>
          <p class="font-semibold">{{ t('exercise_debt_title') }}</p>
          <p class="text-sm">{{ t('exercise_debt_sub') }}</p>
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      {{ t('loading') }}
    </div>

    <div v-else-if="store.sortedTrackables.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🏃</div>
      <p class="text-gray-500 mb-4">{{ t('exercises_empty').replace('{name}', peopleStore.selectedPerson?.name || '') }}</p>
      <button
        @click="openAddForm"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        {{ t('add_exercise') }}
      </button>
    </div>

    <div v-else class="space-y-4">
      <ExerciseCard
        v-for="item in store.sortedTrackables"
        :key="item.id"
        :item="item"
        @click="openDetail(item)"
        @log-exercise="openLogModal(item)"
        @complete-today="handleQuickComplete(item)"
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
      @delete-item="handleDelete"
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

    <!-- Exercise Detail Modal -->
    <ExerciseDetailModal
      v-if="showDetail && detailItem"
      :item="detailItem"
      @close="showDetail = false"
      @edit="handleDetailEdit"
      @view-history="handleDetailHistory"
      @delete="handleDetailDelete"
    />
  </div>
</template>
