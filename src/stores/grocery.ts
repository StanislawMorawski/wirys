import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db'
import type { GroceryItem } from '@/types'
import { changeTracker } from '@/db/changes'

export const useGroceryStore = defineStore('groceries', () => {
  const items = ref<GroceryItem[]>([])
  const loading = ref(false)

  const uncheckedItems = computed(() => 
    items.value.filter(i => !i.checked).sort((a, b) => a.order - b.order)
  )

  const checkedItems = computed(() => 
    items.value.filter(i => i.checked).sort((a, b) => a.order - b.order)
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
    const maxOrder = items.value.reduce((max, item) => Math.max(max, item.order), -1)
    const item: GroceryItem = {
      name: name.trim(),
      quantity: quantity?.trim() || undefined,
      category: category?.trim() || undefined,
      checked: false,
      createdAt: new Date(),
      order: maxOrder + 1
    }
    const id = await db.groceries.add(item)
    const added = await db.groceries.get(id)
    if (added) {
      changeTracker.trackAddOrUpdate('grocery', id, added)
    }
    await loadItems()
  }

  async function toggleItem(id: number) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      await db.groceries.update(id, { checked: !item.checked })
      const updated = await db.groceries.get(id)
      if (updated) {
        changeTracker.trackAddOrUpdate('grocery', id, updated)
      }
      await loadItems()
    }
  }

  async function updateItem(id: number, data: Partial<GroceryItem>) {
    await db.groceries.update(id, data)
    const updated = await db.groceries.get(id)
    if (updated) {
      changeTracker.trackAddOrUpdate('grocery', id, updated)
    }
    await loadItems()
  }

  async function deleteItem(id: number) {
    await db.groceries.delete(id)
    changeTracker.trackDelete('grocery', id)
    await loadItems()
  }

  async function clearChecked() {
    const checkedIds = items.value.filter(i => i.checked).map(i => i.id!)
    await db.groceries.bulkDelete(checkedIds)
    checkedIds.forEach(id => changeTracker.trackDelete('grocery', id))
    await loadItems()
  }

  async function uncheckAll() {
    const updates = items.value.map(i => ({ key: i.id!, changes: { checked: false } }))
    await Promise.all(updates.map(u => db.groceries.update(u.key, u.changes)))
    // Track all updates
    for (const item of items.value) {
      if (item.id) {
        const updated = await db.groceries.get(item.id)
        if (updated) {
          changeTracker.trackAddOrUpdate('grocery', item.id, updated)
        }
      }
    }
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
