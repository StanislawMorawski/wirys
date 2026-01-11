<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { t } from '@/i18n'

const route = useRoute()
const router = useRouter()

const getPageTitle = () => {
  switch (route.path) {
    case '/':
      return t('nav_chores')
    case '/exercises':
      return t('nav_exercises')
    case '/groceries':
      return t('nav_groceries')
    case '/expenses':
      return t('nav_expenses')
    case '/settings':
      return t('nav_settings')
    default:
      return ''
  }
}

const goToSettings = () => {
  router.push('/settings')
}
</script>

<template>
  <div class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
    <div class="flex justify-between items-center h-14 max-w-2xl mx-auto px-4">
      <h1 class="text-lg font-bold text-gray-900">{{ getPageTitle() }}</h1>
      <button 
        v-if="route.path !== '/settings'"
        @click="goToSettings"
        class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        :aria-label="t('nav_settings')"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
</template>
