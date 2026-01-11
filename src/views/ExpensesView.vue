<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db } from '@/db'
import type { Expense } from '@/types'
import { t } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import SyncButton from '@/components/SyncButton.vue'
import { changeTracker } from '@/db/changes'

const settingsStore = useSettingsStore()
const expenses = ref<Expense[]>([])
const showAddForm = ref(false)
const newExpenseName = ref('')
const newExpenseDescription = ref('')
const newExpenseCost = ref<number | null>(null)

// Drag and drop state
const draggedItem = ref<Expense | null>(null)
const draggedOverIndex = ref<number | null>(null)

const showBudgetEdit = ref(false)
const budgetInput = ref(settingsStore.budget)

const completedTotal = computed(() => {
  return expenses.value.filter(e => e.completed).reduce((sum, e) => sum + e.cost, 0)
})

const remainingBudget = computed(() => {
  return settingsStore.budget - completedTotal.value
})

function handleSynced() {
  loadExpenses()
}

onMounted(async () => {
  await loadExpenses()
})

async function loadExpenses() {
  expenses.value = await db.expenses.orderBy('order').toArray()
}

async function addExpense() {
  if (!newExpenseName.value.trim() || newExpenseCost.value === null || newExpenseCost.value < 0) return
  
  const maxOrder = expenses.value.length > 0 
    ? Math.max(...expenses.value.map(e => e.order)) 
    : -1
  
  const id = await db.expenses.add({
    name: newExpenseName.value.trim(),
    description: newExpenseDescription.value.trim() || undefined,
    cost: newExpenseCost.value,
    order: maxOrder + 1,
    completed: false,
    createdAt: new Date()
  })
  
  const added = await db.expenses.get(id)
  if (added) {
    changeTracker.trackAddOrUpdate('expense', id, added)
  }
  
  newExpenseName.value = ''
  newExpenseDescription.value = ''
  newExpenseCost.value = null
  showAddForm.value = false
  
  await loadExpenses()
}

async function deleteExpense(id: number | undefined) {
  if (!id) return
  await db.expenses.delete(id)
  changeTracker.trackDelete('expense', id)
  await loadExpenses()
}

function onDragStart(expense: Expense) {
  draggedItem.value = expense
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
  
  const dragIndex = expenses.value.findIndex(e => e.id === draggedItem.value?.id)
  if (dragIndex === -1 || dragIndex === dropIndex) {
    draggedItem.value = null
    draggedOverIndex.value = null
    return
  }
  
  // Reorder the array
  const newExpenses = [...expenses.value]
  const [removed] = newExpenses.splice(dragIndex, 1)
  newExpenses.splice(dropIndex, 0, removed)
  
  // Update order field for all items
  for (let i = 0; i < newExpenses.length; i++) {
    if (newExpenses[i].id) {
      await db.expenses.update(newExpenses[i].id!, { order: i })
      const updated = await db.expenses.get(newExpenses[i].id!)
      if (updated) {
        changeTracker.trackAddOrUpdate('expense', newExpenses[i].id!, updated)
      }
    }
  }
  
  await loadExpenses()
  
  draggedItem.value = null
  draggedOverIndex.value = null
}

function onDragEnd() {
  draggedItem.value = null
  draggedOverIndex.value = null
}

async function completeExpense(id: number | undefined) {
  if (!id) return
  const expense = expenses.value.find(e => e.id === id)
  if (!expense) return
  
  await db.expenses.update(id, { completed: true })
  const updated = await db.expenses.get(id)
  if (updated) {
    changeTracker.trackAddOrUpdate('expense', id, updated)
  }
  settingsStore.adjustBudget(-expense.cost)
  await loadExpenses()
}

async function uncompleteExpense(id: number | undefined) {
  if (!id) return
  const expense = expenses.value.find(e => e.id === id)
  if (!expense) return
  
  await db.expenses.update(id, { completed: false })
  const updated = await db.expenses.get(id)
  if (updated) {
    changeTracker.trackAddOrUpdate('expense', id, updated)
  }
  settingsStore.adjustBudget(expense.cost)
  await loadExpenses()
}

function canAfford(cost: number): boolean {
  return remainingBudget.value >= cost
}

function saveBudgetChange() {
  settingsStore.setBudget(budgetInput.value)
  showBudgetEdit.value = false
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settingsStore.currency
  }).format(amount)
}
</script>

<template>
  <div class="min-h-screen pb-20 pt-14 bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 py-4 space-y-4">
      
      <!-- Add Expense Button and Sync -->
      <div class="flex gap-2">
        <button
          v-if="!showAddForm"
          @click="showAddForm = true"
          class="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + {{ t('add_expense') }}
        </button>
        <SyncButton @synced="handleSynced" />
      </div>

      <!-- Add Form -->
      <div v-if="showAddForm" class="bg-white rounded-lg shadow p-4 space-y-3">
        <input
          v-model="newExpenseName"
          type="text"
          :placeholder="t('expense_name')"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          @keyup.enter="addExpense"
        />
        
        <input
          v-model.number="newExpenseCost"
          type="number"
          step="0.01"
          min="0"
          :placeholder="t('expense_cost')"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          @keyup.enter="addExpense"
        />
        
        <textarea
          v-model="newExpenseDescription"
          :placeholder="t('expense_description')"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        ></textarea>
        
        <div class="flex gap-2">
          <button
            @click="addExpense"
            class="flex-1 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 transition-colors"
          >
            {{ t('add') }}
          </button>
          <button
            @click="showAddForm = false; newExpenseName = ''; newExpenseDescription = ''; newExpenseCost = null"
            class="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            {{ t('cancel') }}
          </button>
        </div>
      </div>

      <!-- Budget and Totals Display -->
      <div v-if="expenses.length > 0" class="space-y-3">
        <!-- Budget -->
        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold text-gray-700">{{ t('budget') }}:</span>
            <div class="flex items-center gap-2">
              <span v-if="!showBudgetEdit" class="text-2xl font-bold text-blue-700">{{ formatCurrency(settingsStore.budget) }}</span>
              <input
                v-else
                v-model.number="budgetInput"
                type="number"
                step="0.01"
                class="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                @keyup.enter="saveBudgetChange"
              />
              <button
                v-if="!showBudgetEdit"
                @click="showBudgetEdit = true; budgetInput = settingsStore.budget"
                class="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {{ t('edit') }}
              </button>
              <button
                v-else
                @click="saveBudgetChange"
                class="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {{ t('save') }}
              </button>
              <button
                v-if="!showBudgetEdit"
                @click="settingsStore.adjustBudget(100)"
                class="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                +
              </button>
              <button
                v-if="!showBudgetEdit"
                @click="settingsStore.adjustBudget(-100)"
                class="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expenses List -->
      <div class="space-y-2">
        <div
          v-for="(expense, index) in expenses"
          :key="expense.id"
          draggable="true"
          @dragstart="onDragStart(expense)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
          :class="[
            'bg-white rounded-lg shadow p-4 cursor-move transition-all',
            draggedOverIndex === index ? 'border-2 border-primary-400 scale-105' : 'border border-gray-200',
            draggedItem?.id === expense.id ? 'opacity-50' : '',
            expense.completed ? 'opacity-60 bg-gray-50' : '',
            !expense.completed && canAfford(expense.cost) ? 'ring-2 ring-green-300' : ''
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <!-- Drag Handle -->
            <div class="text-gray-400 mt-1 flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
              </svg>
            </div>
            
            <!-- Expense Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-gray-900 truncate" :class="{ 'line-through': expense.completed }">
                  {{ expense.name }}
                </h3>
                <span v-if="expense.completed" class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                  ✓ {{ t('completed') }}
                </span>
                <span v-else-if="canAfford(expense.cost)" class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                  {{ t('affordable') }}
                </span>
              </div>
              <p v-if="expense.description" class="text-sm text-gray-600 mt-1">{{ expense.description }}</p>
            </div>
            
            <!-- Cost and Actions -->
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <span class="text-lg font-bold text-primary-600">{{ formatCurrency(expense.cost) }}</span>
              <div class="flex gap-2">
                <button
                  v-if="!expense.completed"
                  @click="completeExpense(expense.id)"
                  class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  {{ t('complete_expense') }}
                </button>
                <button
                  v-else
                  @click="uncompleteExpense(expense.id)"
                  class="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                >
                  {{ t('undo') }}
                </button>
                <button
                  @click="deleteExpense(expense.id)"
                  class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                >
                  {{ t('delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="expenses.length === 0 && !showAddForm" class="text-center py-12 text-gray-500">
        <p class="text-lg">{{ t('no_items') }}</p>
        <p class="text-sm mt-2">{{ t('add_expense') }}</p>
      </div>
    </div>
  </div>
</template>
