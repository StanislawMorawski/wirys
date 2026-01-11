<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/i18n'
import { usePeopleStore } from '@/stores/people'

const store = usePeopleStore()

const newName = ref('')
const newEmoji = ref('🙂')

const editingId = ref<string | null>(null)
const editName = ref('')
const editEmoji = ref('')

function startEdit(p: { id: string; name: string; emoji: string }) {
  editingId.value = p.id
  editName.value = p.name
  editEmoji.value = p.emoji
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit() {
  if (!editingId.value) return
  const name = editName.value.trim()
  const emoji = editEmoji.value.trim() || '🙂'
  if (!name) return
  store.updatePerson(editingId.value, { name, emoji })
  editingId.value = null
}

function addPerson() {
  const name = newName.value.trim()
  const emoji = newEmoji.value.trim() || '🙂'
  if (!name) return
  store.addPerson(name, emoji)
  newName.value = ''
  newEmoji.value = '🙂'
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
            v-if="editingId !== person.id"
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

      <!-- Inline editor -->
      <div v-if="editingId" class="p-3 border rounded-lg">
        <div class="flex gap-2">
          <input v-model="editEmoji" class="w-16 px-2 py-1 border rounded" />
          <input v-model="editName" class="flex-1 px-3 py-1 border rounded" />
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="saveEdit" class="px-4 py-2 bg-primary-600 text-white rounded">{{ t('save') }}</button>
          <button @click="cancelEdit" class="px-4 py-2 border rounded">{{ t('cancel') }}</button>
        </div>
      </div>

      <!-- Add new person -->
      <div class="pt-3 border-t">
        <h3 class="font-medium mb-2">{{ t('add_person') }}</h3>
        <div class="flex gap-2">
          <input v-model="newEmoji" class="w-16 px-2 py-1 border rounded" />
          <input v-model="newName" placeholder="Name" class="flex-1 px-3 py-1 border rounded" />
          <button @click="addPerson" class="px-4 py-2 bg-primary-600 text-white rounded">{{ t('add_person_button') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>