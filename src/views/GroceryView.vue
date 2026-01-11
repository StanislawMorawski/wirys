<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '@/i18n'
import { useGroceryStore } from '@/stores/grocery'
import SyncButton from '@/components/SyncButton.vue'
import type { GroceryItem } from '@/types'

const store = useGroceryStore()

const newItemName = ref('')
const showAddForm = ref(false)
const editingItemId = ref<number | null>(null)
const editingItemName = ref('')

// Drag and drop state
const draggedItem = ref<GroceryItem | null>(null)
const draggedOverIndex = ref<number | null>(null)

function handleSynced() {
  store.loadItems()
}

onMounted(() => {
  store.loadItems()
})

async function handleAddItem() {
  if (!newItemName.value.trim()) return
  await store.addItem(newItemName.value)
  newItemName.value = ''
  showAddForm.value = false
}

async function handleQuickAdd(event: KeyboardEvent) {
  if (event.key === 'Enter' && newItemName.value.trim()) {
    await handleAddItem()
  }
}

function handleClearChecked() {
  if (store.checkedItems.length === 0) return
  if (confirm(`Remove ${store.checkedItems.length} checked items?`)) {
    store.clearChecked()
  }
}

function startEditItem(item: any) {
  editingItemId.value = item.id
  editingItemName.value = item.name
}

async function saveEdit() {
  if (editingItemId.value && editingItemName.value.trim()) {
    await store.updateItem(editingItemId.value, { name: editingItemName.value.trim() })
    editingItemId.value = null
    editingItemName.value = ''
  }
}

function cancelEdit() {
  editingItemId.value = null
  editingItemName.value = ''
}

async function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    await saveEdit()
  } else if (event.key === 'Escape') {
    cancelEdit()
  }
}

// Drag and drop handlers
function onDragStart(item: GroceryItem) {
  draggedItem.value = item
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  draggedOverIndex.value = index
}

function onDragLeave() {
  draggedOverIndex.value = null
}

async function onDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault()
  
  if (!draggedItem.value) return
  
  const dragIndex = store.uncheckedItems.findIndex(i => i.id === draggedItem.value?.id)
  if (dragIndex === -1 || dragIndex === dropIndex) {
    draggedItem.value = null
    draggedOverIndex.value = null
    return
  }
  
  // Reorder the array
  const newItems = [...store.uncheckedItems]
  const [removed] = newItems.splice(dragIndex, 1)
  newItems.splice(dropIndex, 0, removed)
  
  // Update order field for all items
  for (let i = 0; i < newItems.length; i++) {
    if (newItems[i].id) {
      await store.updateItem(newItems[i].id!, { order: i })
    }
  }
  
  await store.loadItems()
  
  draggedItem.value = null
  draggedOverIndex.value = null
}

function onDragEnd() {
  draggedItem.value = null
  draggedOverIndex.value = null
}

</script>

<template>
  <div>
    <!-- Quick add input and sync -->
    <div class="mb-4">
      <div class="flex gap-2">
        <input
          v-model="newItemName"
          @keydown="handleQuickAdd"
          type="text"
          :placeholder="t('placeholder_add_item')"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
        <button
          @click="handleAddItem"
          :disabled="!newItemName.trim()"
          class="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
        >
          {{ t('add') }}
        </button>
        <SyncButton @synced="handleSynced" />
      </div>
    </div>

    <!-- Clear done button -->
    <div v-if="store.checkedItems.length > 0" class="mb-4">
      <button
        @click="handleClearChecked"
        class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
      >
        {{ t('clear_done') }}
      </button>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      {{ t('loading') }}
    </div>

    <div v-else-if="store.items.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🛒</div>
      <p class="text-gray-500">{{ t('grocery_empty_title') }}</p>
      <p class="text-gray-400 text-sm mt-1">{{ t('grocery_empty_sub') }}</p>
    </div>

    <div v-else class="space-y-2">
      <!-- Unchecked items -->
      <div
        v-for="(item, index) in store.uncheckedItems"
        :key="item.id"
        draggable="true"
        @dragstart="onDragStart(item)"
        @dragover="onDragOver($event, index)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
        :class="[
          'flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all cursor-move',
          draggedOverIndex === index ? 'border-primary-500 border-2 bg-primary-50' : ''
        ]"
      >
        <button
          @click="store.toggleItem(item.id!)"
          class="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-primary-500 flex-shrink-0 transition-colors touch-action-manipulation"
        ></button>
        
        <!-- Editable name -->
        <div v-if="editingItemId === item.id" class="flex-1 flex gap-2">
          <input
            v-model="editingItemName"
            @keydown="handleEditKeydown"
            @blur="saveEdit"
            type="text"
            class="flex-1 px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            autofocus
          />
        </div>
        <div v-else class="flex-1 min-w-0 cursor-pointer" @click="startEditItem(item)">
          <span class="font-medium text-gray-900">{{ item.name }}</span>
        </div>
        
        <button
          @click="store.deleteItem(item.id!)"
          class="text-gray-400 hover:text-red-500 p-1 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Checked items section -->
      <div v-if="store.checkedItems.length > 0" class="mt-6">
        <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          Done ({{ store.checkedItems.length }})
        </h2>
        <div
          v-for="item in store.checkedItems"
          :key="item.id"
          class="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
        >
          <button
            @click="store.toggleItem(item.id!)"
            class="w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 flex-shrink-0 flex items-center justify-center transition-colors touch-action-manipulation"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <div class="flex-1 min-w-0">
            <span class="text-gray-400 line-through">{{ item.name }}</span>
          </div>
          <button
            @click="store.deleteItem(item.id!)"
            class="text-gray-300 hover:text-red-500 p-1 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
