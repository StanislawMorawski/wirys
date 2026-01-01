import { ref } from 'vue'

// Reactive offset in milliseconds from real system time
export const offsetMs = ref(0)

export function getNow(): Date {
  return new Date(Date.now() + offsetMs.value)
}

export function setNowTo(date: Date) {
  offsetMs.value = date.getTime() - Date.now()
}

export function advanceBy({ days = 0, hours = 0, minutes = 0 } = {}) {
  const ms = ((days * 24 + hours) * 60 + minutes) * 60 * 1000
  offsetMs.value += ms
}

export function setOffsetMs(ms: number) {
  offsetMs.value = ms
}

export function reset() {
  offsetMs.value = 0
}
