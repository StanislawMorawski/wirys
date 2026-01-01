<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const navItems = [
  { name: 'Chores', path: '/', icon: '🏠' },
  { name: 'Exercises', path: '/exercises', icon: '💪' },
  { name: 'Groceries', path: '/groceries', icon: '🛒' }
]

const isActive = (path: string) => {
  return route.path === path
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
    <div class="flex justify-around items-center h-16 max-w-2xl mx-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center flex-1 h-full transition-colors touch-action-manipulation"
        :class="isActive(item.path) ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
      >
        <span class="text-xl mb-1">{{ item.icon }}</span>
        <span class="text-xs font-medium">{{ item.name }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
