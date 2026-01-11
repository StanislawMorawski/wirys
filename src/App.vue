<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import TopBar from '@/components/TopBar.vue'
import DevTimePanel from '@/components/DevTimePanel.vue'
const isDev = import.meta.env.DEV
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <TopBar />
    <AppNavigation />
    <main class="container mx-auto px-4 pb-20 pt-16 max-w-2xl">
      <RouterView />
    </main>
    <DevTimePanel v-if="isDev" />
  </div>
</template>
