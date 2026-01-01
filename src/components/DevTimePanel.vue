<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { offsetMs, getNow, setNowTo, advanceBy, reset } from '@/dev/time'

const isDev = import.meta.env.DEV

const localInput = ref('')

function toInputValue(d: Date) {
  // Produce YYYY-MM-DDTHH:mm (datetime-local) in local timezone
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hour = pad(d.getHours())
  const minute = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function parseInputValue(val: string) {
  // Parse YYYY-MM-DDTHH:mm into a local Date
  if (!val) return new Date()
  const [datePart, timePart] = val.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

const nowStr = computed(() => toInputValue(getNow()))

// keep local input in sync with getNow for convenience
watch(nowStr, (v) => {
  if (!localInput.value) localInput.value = v
})

function setNow() {
  const d = parseInputValue(localInput.value)
  setNowTo(d)
}

function advanceDays(n: number) {
  advanceBy({ days: n })
}

function resetNow() {
  reset()
} 
</script>

<template>
  <div
    v-if="isDev"
    class="fixed right-4 bottom-20 z-50 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm w-72"
  >
    <div class="font-semibold mb-2">Dev Time Panel</div>
    <div class="text-xs text-gray-600 mb-3">Current fake time: <span class="font-medium">{{ toInputValue(getNow()) }}</span></div>

    <div class="mb-2">
      <input v-model="localInput" type="datetime-local" class="w-full px-2 py-1 border rounded" />
    </div>

    <div class="flex gap-2 mb-2">
      <button @click="setNow" class="flex-1 px-2 py-1 bg-primary-600 text-white rounded">Set Now</button>
      <button @click="resetNow" class="px-2 py-1 border rounded">Reset</button>
    </div>

    <div class="flex gap-2 mb-2">
      <button @click="advanceDays(1)" class="flex-1 px-2 py-1 border rounded">+1 day</button>
      <button @click="advanceDays(7)" class="px-2 py-1 border rounded">+7 days</button>
    </div> 

    <div class="text-xs text-gray-500">Offset: <span class="font-medium">{{ (offsetMs / 1000 / 60 / 60).toFixed(2) }}</span> hrs</div>
  </div>
</template>

<style scoped>
/* Small tweaks to keep panel readable */
</style>
