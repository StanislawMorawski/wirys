<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '@/i18n'
import CalendarGrid from '@/components/CalendarGrid.vue'
import { db, getAllCompletions } from '@/db'
import { getNow } from '@/dev/time'

const events = ref<Array<{ date: string; payload: any }>>([])
const loading = ref(false)
const selectedDay = ref<string | null>(null)
const dayEntries = ref<any[]>([])

async function load() {
  loading.value = true
  try {
    const completions = await getAllCompletions()
    const chores = await db.trackables.where('type').equals('chore').toArray()
    const choreIds = new Set(chores.map(c => c.id))
    const trackableMap = new Map(chores.map(c => [c.id, c.name]))

    const filtered = completions.filter(c => choreIds.has(c.trackableId))
    events.value = filtered.map(c => ({ date: new Date(c.completedAt).toISOString().slice(0,10), payload: { trackableName: trackableMap.get(c.trackableId), notes: c.notes } }))
  } finally {
    loading.value = false
  }
}

function onDayClick(date: string) {
  selectedDay.value = date
  // Build entries
  getAllCompletions().then(all => {
    const chores = all.filter(c => new Date(c.completedAt).toISOString().slice(0,10) === date && c.trackableId)
    dayEntries.value = chores
  }).catch(e => {
    console.error('Failed to load completions for day:', e)
    dayEntries.value = []
  })
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">📅 {{ t('chores_calendar') }}</h1>

    <div v-if="loading" class="text-gray-500">{{ t('loading') }}</div>
    <div v-else>
      <div class="text-xs text-gray-500 mb-2">{{ t('chore_completions_month').replace('{count}', String(events.length)) }}</div>
      <CalendarGrid :events="events" @dayClick="onDayClick" />

      <div v-if="selectedDay" class="mt-4">
        <div class="font-semibold mb-2">{{ t('entries_on') }} {{ selectedDay }}</div>
        <ul class="space-y-2">
          <li v-for="e in dayEntries" :key="e.id" class="py-2 px-3 bg-gray-50 rounded">
            <div class="text-sm font-medium">{{ new Date(e.completedAt).toLocaleString() }}</div>
            <div class="text-xs text-gray-600">{{ e.notes }}</div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
