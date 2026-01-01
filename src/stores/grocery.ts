import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db'
import type { GroceryItem } from '@/types'

export const useGroceryStore = defineStore('groceries', () => {
  const items = ref<GroceryItem[]>([])
  const loading = ref(false)

  const uncheckedItems = computed(() => 
    items.value.filter(i => !i.checked).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  const checkedItems = computed(() => 
    items.value.filter(i => i.checked).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  async function loadItems() {
    loading.value = true
    try {
      items.value = await db.groceries.toArray()
    } finally {
      loading.value = false
    }
  }

  async function addItem(name: string, quantity?: string, category?: string) {
    const item: GroceryItem = {
      name: name.trim(),
      quantity: quantity?.trim() || undefined,
      category: category?.trim() || undefined,
      checked: false,
      createdAt: new Date()
    }
    await db.groceries.add(item)
    await loadItems()
  }

  async function toggleItem(id: number) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      await db.groceries.update(id, { checked: !item.checked })
      await loadItems()
    }
  }

  async function updateItem(id: number, data: Partial<GroceryItem>) {
    await db.groceries.update(id, data)
    await loadItems()
  }

  async function deleteItem(id: number) {
    await db.groceries.delete(id)
    await loadItems()
  }

  async function clearChecked() {
    const checkedIds = items.value.filter(i => i.checked).map(i => i.id!)
    await db.groceries.bulkDelete(checkedIds)
    await loadItems()
  }

  async function uncheckAll() {
    const updates = items.value.map(i => ({ key: i.id!, changes: { checked: false } }))
    await Promise.all(updates.map(u => db.groceries.update(u.key, u.changes)))
    await loadItems()
  }

  return {
    items,
    loading,
    uncheckedItems,
    checkedItems,
    loadItems,
    addItem,
    toggleItem,
    updateItem,
    deleteItem,
    clearChecked,
    uncheckAll
  }
})
