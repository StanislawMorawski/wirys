import { createRouter, createWebHistory } from 'vue-router'
import ChoresView from '@/views/ChoresView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import GroceryView from '@/views/GroceryView.vue'
import ChoresCalendarView from '@/views/ChoresCalendarView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chores',
      component: ChoresView
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: ExercisesView
    },
    {
      path: '/groceries',
      name: 'groceries',
      component: GroceryView
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: ChoresCalendarView
    }
  ]
})

export default router
