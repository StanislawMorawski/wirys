import { createRouter, createWebHistory } from 'vue-router'
import ChoresView from '@/views/ChoresView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import GroceryView from '@/views/GroceryView.vue'
import SettingsView from '@/views/SettingsView.vue'

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
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

export default router
