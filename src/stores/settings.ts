import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Currency } from '@/types'

const CURRENCY_KEY = 'wirys_currency'
const BUDGET_KEY = 'wirys_budget'

export const useSettingsStore = defineStore('settings', () => {
  const currency = ref<Currency>((localStorage.getItem(CURRENCY_KEY) as Currency) || 'USD')
  const budget = ref<number>(parseFloat(localStorage.getItem(BUDGET_KEY) || '0'))

  function setCurrency(newCurrency: Currency) {
    currency.value = newCurrency
    localStorage.setItem(CURRENCY_KEY, newCurrency)
  }

  function setBudget(amount: number) {
    budget.value = amount
    localStorage.setItem(BUDGET_KEY, amount.toString())
  }

  function adjustBudget(delta: number) {
    setBudget(budget.value + delta)
  }

  return {
    currency,
    setCurrency,
    budget,
    setBudget,
    adjustBudget
  }
})
