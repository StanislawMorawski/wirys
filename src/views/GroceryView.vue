<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGroceryStore } from '@/stores/grocery'

const store = useGroceryStore()

const newItemName = ref('')
const newItemQuantity = ref('')
const showAddForm = ref(false)

onMounted(() => {
  store.loadItems()
})

async function handleAddItem() {
  if (!newItemName.value.trim()) return
  await store.addItem(newItemName.value, newItemQuantity.value)
  newItemName.value = ''
  newItemQuantity.value = ''
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
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-900">🛒 Groceries</h1>
      <div class="flex gap-2">
        <button
          v-if="store.checkedItems.length > 0"
          @click="handleClearChecked"
          class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
        >
          Clear done
        </button>
      </div>
    </div>

    <!-- Quick add input -->
    <div class="mb-4">
      <div class="flex gap-2">
        <input
          v-model="newItemName"
          @keydown="handleQuickAdd"
          type="text"
          placeholder="Add item..."
          class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
        <input
          v-model="newItemQuantity"
          @keydown="handleQuickAdd"
          type="text"
          placeholder="Qty"
          class="w-20 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
        <button
          @click="handleAddItem"
          :disabled="!newItemName.trim()"
          class="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-12 text-gray-500">
      Loading...
    </div>

    <div v-else-if="store.items.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🛒</div>
      <p class="text-gray-500">Your grocery list is empty.</p>
      <p class="text-gray-400 text-sm mt-1">Add items above to get started!</p>
    </div>

    <div v-else class="space-y-2">
      <!-- Unchecked items -->
      <div
        v-for="item in store.uncheckedItems"
        :key="item.id"
        class="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <button
          @click="store.toggleItem(item.id!)"
          class="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-primary-500 flex-shrink-0 transition-colors touch-action-manipulation"
        ></button>
        <div class="flex-1 min-w-0">
          <span class="font-medium text-gray-900">{{ item.name }}</span>
          <span v-if="item.quantity" class="text-gray-500 ml-2 text-sm">
            ({{ item.quantity }})
          </span>
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
            <span v-if="item.quantity" class="text-gray-300 ml-2 text-sm line-through">
              ({{ item.quantity }})
            </span>
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
