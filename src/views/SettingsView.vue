<script setup lang="ts">
import GistSyncPanel from '@/components/GistSyncPanel.vue'
import PeopleSettings from '@/components/PeopleSettings.vue'
import { locale, setLocale, t } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import type { Currency } from '@/types'

const settingsStore = useSettingsStore()

const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'PLN', 'CAD', 'AUD']
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white border rounded p-4">
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">{{ t('language') }}</label>
        <div class="flex gap-2">
          <button @click="setLocale('en')" :class="{ 'bg-primary-600 text-white': locale === 'en' }" class="px-3 py-1 border rounded">{{ t('lang_en') }}</button>
          <button @click="setLocale('pl')" :class="{ 'bg-primary-600 text-white': locale === 'pl' }" class="px-3 py-1 border rounded">{{ t('lang_pl') }}</button>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">{{ t('currency') }}</label>
        <select 
          :value="settingsStore.currency" 
          @change="settingsStore.setCurrency(($event.target as HTMLSelectElement).value as Currency)"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option v-for="curr in currencies" :key="curr" :value="curr">{{ curr }}</option>
        </select>
      </div>

      <PeopleSettings />

      <GistSyncPanel />
    </div>
  </div>
</template>
