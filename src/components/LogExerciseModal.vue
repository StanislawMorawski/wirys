<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { t } from '@/i18n'
import type { TrackableWithStatus } from '@/types'

const props = defineProps<{
  show: boolean
  item: TrackableWithStatus | null
}>()

const emit = defineEmits<{
  close: []
  submit: [amount: number, notes?: string]
}>()

const amount = ref(0)
const notes = ref('')

const unitLabel = computed(() => props.item?.exerciseUnit || 'reps')
const debtAmount = computed(() => props.item?.debt || 0)
const canDoAdvance = computed(() => props.item?.canDoAdvance ?? true)

watch(() => props.show, (show) => {
  if (show) {
    // Pre-fill with debt amount if there's debt, otherwise target amount
    amount.value = debtAmount.value > 0 
      ? Math.min(debtAmount.value, props.item?.targetAmount || 0)
      : props.item?.targetAmount || 0
    notes.value = ''
  }
})

function handleSubmit() {
  if (amount.value <= 0) return
  emit('submit', amount.value, notes.value.trim() || undefined)
}

const quickAmounts = computed(() => {
  const target = props.item?.targetAmount || 10
  return [
    Math.round(target * 0.5),
    target,
    Math.round(target * 1.5),
    Math.round(target * 2)
  ].filter((v, i, arr) => arr.indexOf(v) === i && v > 0)
})

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
          <h2 class="text-xl font-bold text-gray-900 mb-2">
            {{ t('log_title') }} {{ item?.name }}
          </h2>
          
          <div v-if="debtAmount > 0" class="mb-4 p-3 bg-red-50 rounded-lg">
            <p class="text-sm text-red-700">
              <span class="font-medium">{{ t('debt_to_pay') }}</span> {{ debtAmount }} {{ unitLabel }}
            </p>
          </div>
          
          <div v-else-if="canDoAdvance" class="mb-4 p-3 bg-green-50 rounded-lg">
            <p class="text-sm text-green-700">
              {{ t('all_caught_up') }}
            </p>
          </div>
          
          <div v-else class="mb-4 p-3 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-700">
              {{ t('already_done') }}
            </p>
          </div>
          
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('amount_label') }} ({{ unitLabel }})
              </label>
              <input
                v-model.number="amount"
                type="number"
                min="1"
                step="1"
                required
                class="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              
              <!-- Quick amount buttons -->
              <div class="flex gap-2 mt-2">
                <button
                  v-for="qa in quickAmounts"
                  :key="qa"
                  type="button"
                  @click="amount = qa"
                  class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
                  :class="amount === qa 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                >
                  {{ qa }}
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('notes_optional') }}
              </label>
              <input
                v-model="notes"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Morning session"
              />
            </div>
            
            <div class="flex gap-3 pt-4">
              <button
                type="button"
                @click="emit('close')"
                class="flex-1 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                {{ t('cancel') }}
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
              >
                {{ t('log_button') }} {{ amount }} {{ unitLabel }}
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
