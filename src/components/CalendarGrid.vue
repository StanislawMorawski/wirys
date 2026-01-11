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
    
    const todayStr = computed(() => {
      const now = new Date()
      return now.toISOString().slice(0, 10)
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
      todayStr,
      prevMonth,
      nextMonth,
      onDayClick
    }
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <button @click="prevMonth" class="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="text-lg font-semibold">{{ new Date(activeYear, activeMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' }) }}</div>
      <button @click="nextMonth" class="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-7 gap-0.5 text-xs font-semibold text-gray-600 mb-1">
      <div v-for="wd in weekDays" :key="wd" class="text-center py-2">{{ wd }}</div>
    </div>

    <div class="grid grid-cols-7 gap-0.5 bg-gray-200 rounded-lg p-0.5">
      <!-- blank slots for first day offset -->
      <template v-for="_i in firstDayOfMonth" :key="'blank-' + _i">
        <div class="bg-gray-50 aspect-square"></div>
      </template>

      <button
        v-for="cell in grid"
        :key="cell.date"
        @click="onDayClick(cell.date)"
        :class="[
          'bg-white aspect-square flex flex-col items-center justify-center relative transition-colors',
          eventsByDate.get(cell.date) ? 'hover:bg-primary-50' : 'hover:bg-gray-50',
          highlightSet.has(cell.date) ? 'bg-green-50 ring-2 ring-green-400' : '',
          cell.date === todayStr ? 'ring-2 ring-primary-500 bg-primary-50' : ''
        ]"
      >
        <span class="text-sm font-medium" :class="[
          eventsByDate.get(cell.date) ? 'text-gray-900' : 'text-gray-500',
          cell.date === todayStr ? 'text-primary-700 font-bold' : ''
        ]">
          {{ cell.dayNum }}
        </span>
        <div v-if="eventsByDate.get(cell.date)" class="absolute bottom-1 flex gap-0.5">
          <div 
            v-for="(event, i) in eventsByDate.get(cell.date) || []" 
            :key="i"
            v-show="i < 3"
            :class="[
              'w-1.5 h-1.5 rounded-full',
              event.type === 'upcoming' ? 'bg-yellow-500' : 'bg-primary-600'
            ]"
          ></div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
</style>
