import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Person } from '@/types'

const DEFAULT_PEOPLE: Person[] = [
  { id: 'person1', name: 'Person 1', emoji: '👤' },
  { id: 'person2', name: 'Person 2', emoji: '👥' }
]

const STORAGE_KEY = 'home-tracker-people'
const SELECTED_PERSON_KEY = 'home-tracker-selected-person'

export const usePeopleStore = defineStore('people', () => {
  const people = ref<Person[]>(loadPeople())
  const selectedPersonId = ref<string>(loadSelectedPerson())

  function loadPeople(): Person[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return DEFAULT_PEOPLE
      }
    }
    return DEFAULT_PEOPLE
  }

  function loadSelectedPerson(): string {
    return localStorage.getItem(SELECTED_PERSON_KEY) || DEFAULT_PEOPLE[0].id
  }

  function savePeople() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people.value))
  }

  function saveSelectedPerson() {
    localStorage.setItem(SELECTED_PERSON_KEY, selectedPersonId.value)
  }

  const selectedPerson = computed(() => {
    return people.value.find(p => p.id === selectedPersonId.value) || people.value[0]
  })

  function selectPerson(id: string) {
    selectedPersonId.value = id
    saveSelectedPerson()
  }

  function updatePerson(id: string, data: Partial<Person>) {
    const index = people.value.findIndex(p => p.id === id)
    if (index !== -1) {
      people.value[index] = { ...people.value[index], ...data }
      savePeople()
    }
  }

  function addPerson(name: string, emoji = '🙂') {
    const id = `person_${Date.now()}`
    people.value.push({ id, name, emoji })
    savePeople()
    return id
  }

  function deletePerson(id: string) {
    // Prevent deleting the last remaining person
    if (people.value.length <= 1) return false

    const index = people.value.findIndex(p => p.id === id)
    if (index === -1) return false

    people.value.splice(index, 1)

    if (selectedPersonId.value === id) {
      selectedPersonId.value = people.value[0]?.id || ''
      saveSelectedPerson()
    }

    savePeople()
    return true
  }

  return {
    people,
    selectedPersonId,
    selectedPerson,
    selectPerson,
    updatePerson,
    addPerson,
    deletePerson,
    savePeople
  }
})
