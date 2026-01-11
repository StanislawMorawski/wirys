<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { t } from '@/i18n'
import type { Trackable, TrackableType, RecurrenceUnit, ExerciseUnit } from '@/types'

const props = defineProps<{
  show: boolean
  type: TrackableType
  editItem?: Trackable | null
  personId?: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: Omit<Trackable, 'id' | 'createdAt' | 'archived'>]
  deleteItem: [id: number]
}>()

const name = ref('')
const description = ref('')
const recurrenceEvery = ref(1)
const recurrenceUnit = ref<RecurrenceUnit>('days')
const exerciseUnit = ref<ExerciseUnit>('reps')
const targetAmount = ref(10)

const isEditing = computed(() => !!props.editItem)
const isExercise = computed(() => props.type === 'exercise')

const typeLabel = computed(() => props.type === 'chore' ? 'Chore' : 'Exercise')

watch(() => props.show, (show) => {
  if (show && props.editItem) {
    name.value = props.editItem.name
    description.value = props.editItem.description || ''
    recurrenceEvery.value = props.editItem.recurrence.every
    recurrenceUnit.value = props.editItem.recurrence.unit
    exerciseUnit.value = props.editItem.exerciseUnit || 'reps'
    targetAmount.value = props.editItem.targetAmount || 10
  } else if (show) {
    name.value = ''
    description.value = ''
    recurrenceEvery.value = 1
    recurrenceUnit.value = 'days'
    exerciseUnit.value = 'reps'
    targetAmount.value = 10
  }
})

function handleSubmit() {
  if (!name.value.trim()) return
  
  const data: Omit<Trackable, 'id' | 'createdAt' | 'archived'> = {
    type: props.type,
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    recurrence: {
      every: recurrenceEvery.value,
      unit: recurrenceUnit.value
    }
  }
  
  if (isExercise.value) {
    data.personId = props.personId
    data.exerciseUnit = exerciseUnit.value
    data.targetAmount = targetAmount.value
  }
  
  emit('save', data)
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this item? All history will be lost.')) {
    // Emit the id of the item to delete so parent doesn't rely on modal-scoped state
    if (props.editItem?.id !== undefined) {
      emit('deleteItem', props.editItem.id)
    } else {
      // Fallback - emit an invalid id to allow parent to handle gracefully
      emit('deleteItem', -1)
    }
  }
}

// Close on navigation
function handleNavigate() {
  // Defer closing so it doesn't interfere with the current router patch/render cycle
  setTimeout(() => emit('close'), 0)
}

onMounted(() => {
  window.addEventListener('wirys:navigate', handleNavigate)
})

onBeforeUnmount(() => {
  window.removeEventListener('wirys:navigate', handleNavigate)
})
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
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ isEditing ? `${t('save')} ${typeLabel}` : `${t('add')} ${typeLabel}` }}
          </h2>
          
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('field_name') }}
              </label>
              <input
                v-model="name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                :placeholder="`e.g., ${type === 'chore' ? 'Clean bathroom' : 'Morning run'}`"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('field_description') }}
              </label>
              <textarea
                v-model="description"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional details..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('field_repeat') }}
              </label>
              <div class="flex gap-2">
                <input
                  v-model.number="recurrenceEvery"
                  type="number"
                  min="1"
                  max="365"
                  class="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <select
                  v-model="recurrenceUnit"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="days">{{ t('unit_days') }}</option>
                  <option value="weeks">{{ t('unit_weeks') }}</option>
                  <option value="months">{{ t('unit_months') }}</option>
                </select>
              </div>
            </div>
            
            <!-- Exercise-specific fields -->
            <template v-if="isExercise">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Target amount per period
                </label>
                <div class="flex gap-2">
                  <input
                    v-model.number="targetAmount"
                    type="number"
                    min="1"
                    class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <select
                    v-model="exerciseUnit"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="reps">{{ t('unit_reps') }}</option>
                    <option value="km">{{ t('unit_km') }}</option>
                    <option value="steps">{{ t('unit_steps') }}</option>
                    <option value="minutes">{{ t('unit_minutes') }}</option>
                    <option value="sets">{{ t('unit_sets') }}</option>
                  </select>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Missing this target will accumulate as debt
                </p>
              </div>
            </template>
            
            <div class="flex gap-3 pt-4">
              <button
                v-if="isEditing"
                type="button"
                @click="handleDelete"
                class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
              <div class="flex-1"></div>
              <button
                type="button"
                @click="emit('close')"
                class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                {{ isEditing ? 'Save' : 'Add' }}
              </button>
            </div>
          </form>
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
