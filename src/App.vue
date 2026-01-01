<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <AppNavigation />
    <main class="container mx-auto px-4 pb-20 pt-4 max-w-2xl">
      <RouterView />
    </main>
  </div>
</template>
