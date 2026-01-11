<script setup lang="ts">
import GistSyncPanel from '@/components/GistSyncPanel.vue'
import PeopleSettings from '@/components/PeopleSettings.vue'
import { locale, setLocale, t } from '@/i18n'
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">⚙️ {{ t('nav_settings') }}</h1>
    <div class="bg-white border rounded p-4">
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">{{ t('language') }}</label>
        <div class="flex gap-2">
          <button @click="setLocale('en')" :class="{ 'bg-primary-600 text-white': locale === 'en' }" class="px-3 py-1 border rounded">{{ t('lang_en') }}</button>
          <button @click="setLocale('pl')" :class="{ 'bg-primary-600 text-white': locale === 'pl' }" class="px-3 py-1 border rounded">{{ t('lang_pl') }}</button>
        </div>
      </div>

      <PeopleSettings />

      <GistSyncPanel />
    </div>
  </div>
</template>
