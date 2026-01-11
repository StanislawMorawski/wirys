<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/i18n'
import { usePeopleStore } from '@/stores/people'

const store = usePeopleStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const newName = ref('')
const newEmoji = ref('🐶')

const editingId = ref<string | null>(null)
const editName = ref('')
const editEmoji = ref('🐶')

// Animal emojis for selection
const animalEmojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯']

function openAddModal() {
  newName.value = ''
  newEmoji.value = '🐶'
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function selectNewEmoji(emoji: string) {
  newEmoji.value = emoji
}

function selectEditEmoji(emoji: string) {
  editEmoji.value = emoji
}

function startEdit(p: { id: string; name: string; emoji: string }) {
  editingId.value = p.id
  editName.value = p.name
  editEmoji.value = p.emoji
  showEditModal.value = true
}

function cancelEdit() {
  showEditModal.value = false
  editingId.value = null
}

function saveEdit() {
  if (!editingId.value) return
  const name = editName.value.trim()
  const emoji = editEmoji.value.trim() || '🐶'
  if (!name) return
  store.updatePerson(editingId.value, { name, emoji })
  showEditModal.value = false
  editingId.value = null
}

function addPerson() {
  const name = newName.value.trim()
  const emoji = newEmoji.value.trim() || '🐶'
  if (!name) return
  store.addPerson(name, emoji)
  showAddModal.value = false
}

function handleDelete(id: string) {
  if (!confirm(t('delete_person_confirm'))) return
  const ok = store.deletePerson(id)
  if (!ok) alert(t('delete_disabled_last_person'))
}
</script>

<template>
  <div class="mb-4">
    <h2 class="font-semibold text-lg mb-2">{{ t('people_title') }}</h2>
    <p class="text-sm text-gray-600 mb-3">{{ t('people_desc') }}</p>

    <div class="space-y-2">
      <div
        v-for="person in store.people"
        :key="person.id"
        class="flex items-center justify-between p-3 border rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div class="text-2xl">{{ person.emoji }}</div>
          <div>
            <div class="font-medium">{{ person.name }}</div>
            <div class="text-xs text-gray-500">{{ store.selectedPersonId === person.id ? t('people_selected') : '' }}</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="store.selectedPersonId !== person.id"
            @click="store.selectPerson(person.id)"
            class="px-3 py-1 border rounded text-sm"
          >
            {{ t('select') }}
          </button>

          <button
            @click="startEdit(person)"
            class="px-3 py-1 border rounded text-sm"
          >
            {{ t('edit') }}
          </button>

          <button
            @click="handleDelete(person.id)"
            class="px-3 py-1 text-red-600 border rounded text-sm"
          >
            {{ t('delete') }}
          </button>
        </div>
      </div>

      <!-- Add new person button -->
      <div class="pt-3 border-t">
        <button
          @click="openAddModal"
          class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          {{ t('add_person') }}
        </button>
      </div>
    </div>

    <!-- Add User Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeAddModal"></div>
          <div class="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('create_user') }}</h2>
            
            <form @submit.prevent="addPerson" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('username_label') }}
                </label>
                <input
                  v-model="newName"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  :placeholder="t('username_label')"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('select_avatar') }}
                </label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="emoji in animalEmojis"
                    :key="emoji"
                    type="button"
                    @click="selectNewEmoji(emoji)"
                    class="text-3xl p-2 rounded-lg border-2 transition-all hover:scale-110"
                    :class="newEmoji === emoji ? 'border-primary-600 bg-primary-50' : 'border-gray-200'"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  @click="closeAddModal"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {{ t('cancel') }}
                </button>
                <button
                  type="submit"
                  class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {{ t('add_person_button') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit User Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="cancelEdit"></div>
          <div class="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('edit') }} {{ t('people_title') }}</h2>
            
            <form @submit.prevent="saveEdit" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('username_label') }}
                </label>
                <input
                  v-model="editName"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  :placeholder="t('username_label')"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('select_avatar') }}
                </label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="emoji in animalEmojis"
                    :key="emoji"
                    type="button"
                    @click="selectEditEmoji(emoji)"
                    class="text-3xl p-2 rounded-lg border-2 transition-all hover:scale-110"
                    :class="editEmoji === emoji ? 'border-primary-600 bg-primary-50' : 'border-gray-200'"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  @click="cancelEdit"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {{ t('cancel') }}
                </button>
                <button
                  type="submit"
                  class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {{ t('save') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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