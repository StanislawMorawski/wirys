<script lang="ts">
import { computed, ref, defineComponent } from 'vue'

export default defineComponent({
  name: 'CalendarGrid',
  props: {
    year: { type: Number, required: false },
    month: { type: Number, required: false }, // 0 indexed
    events: { type: Array as unknown as () => Array<{ date: string; payload?: any }>, default: () => [] },
    highlightDates: { type: Array as unknown as () => string[], required: false }
  },
  emits: ['changeMonth', 'dayClick'],
  setup(props, { emit }) {
    const today = new Date()
    const activeYear = ref(props.year ?? today.getFullYear())
    const activeMonth = ref(props.month ?? today.getMonth())

    const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

    const eventsList = computed(() => props.events || [])

    function daysInMonth(year: number, month: number) {
      return new Date(year, month + 1, 0).getDate()
    }

    const firstDayOfMonth = computed(() => new Date(activeYear.value, activeMonth.value, 1).getDay())

    const grid = computed(() => {
      const days = [] as Array<{ date: string; dayNum: number }>
      const total = daysInMonth(activeYear.value, activeMonth.value)
      for (let d = 1; d <= total; d++) {
        const dt = new Date(activeYear.value, activeMonth.value, d)
        const dateStr = dt.toISOString().slice(0,10)
        days.push({ date: dateStr, dayNum: d })
      }
      return days
    })

    const eventsByDate = computed(() => {
      const map = new Map<string, any[]>()
      for (const e of (eventsList.value || [])) {
        const key = (e.date || '').split('T')[0]
        if (!key) continue
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(e.payload ?? {})
      }
      return map
    })

    const highlightSet = computed(() => new Set((props.highlightDates || []).map(d => d)))

    function prevMonth() {
      if (activeMonth.value === 0) {
        activeMonth.value = 11
        activeYear.value--
      } else {
        activeMonth.value--
      }
      emit('changeMonth', activeYear.value, activeMonth.value)
    }
    function nextMonth() {
      if (activeMonth.value === 11) {
        activeMonth.value = 0
        activeYear.value++
      } else {
        activeMonth.value++
      }
      emit('changeMonth', activeYear.value, activeMonth.value)
    }

    function onDayClick(date: string) {
      emit('dayClick', date)
    }

    return {
      activeYear,
      activeMonth,
      weekDays,
      firstDayOfMonth,
      grid,
      eventsByDate,
      eventsList,
      highlightSet,
      prevMonth,
      nextMonth,
      onDayClick
    }
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-semibold">{{ new Date(activeYear, activeMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' }) }}</div>
      <div class="flex gap-2">
        <button @click="prevMonth" class="px-2 py-1 border rounded">Prev</button>
        <button @click="nextMonth" class="px-2 py-1 border rounded">Next</button>
      </div>
    </div>

    <div class="text-xs text-gray-500 mb-2">Events this month: {{ eventsList.length }}</div>

    <div class="grid grid-cols-7 gap-1 text-xs text-gray-500">
      <div v-for="wd in weekDays" :key="wd" class="text-center font-medium">{{ wd }}</div>
    </div>

    <div class="grid grid-cols-7 gap-1 mt-2">
      <!-- blank slots for first day offset -->
      <template v-for="_i in firstDayOfMonth">
        <div class="h-20 border rounded bg-white/0"></div>
      </template>

      <div
        v-for="cell in grid"
        :key="cell.date"
        :class="['h-20 border rounded p-1 bg-white flex flex-col justify-between', highlightSet.has(cell.date) ? 'bg-green-50 border-green-200' : '']"
      >
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium">{{ cell.dayNum }}</div>
          <div v-if="eventsByDate.get(cell.date)" class="text-xs text-blue-600">{{ eventsByDate.get(cell.date)!.length }}</div>
        </div>
        <div class="text-xs mt-2 overflow-hidden text-ellipsis">
          <div v-for="(ev, idx) in (eventsByDate.get(cell.date) || []).slice(0,3)" :key="idx" class="text-xs text-gray-700">• {{ ev.name || ev.trackableName || ev.label || 'Entry' }}</div>
        </div>
        <button @click="onDayClick(cell.date)" class="text-xs text-gray-500 mt-1 self-end">View</button>
      </div>

      <div v-if="grid.length === 0" class="col-span-7 text-center text-gray-500 py-6">No days in this month</div>
    </div>
  </div>
</template>

<style scoped>
</style>
