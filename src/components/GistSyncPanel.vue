<script setup lang="ts">
import { ref } from 'vue'
import { getToken, setToken, getGistId, setGistId, searchWirysGists } from '@/services/gistStorage'
import { mergeWithGist } from '@/db/sync'
import { t } from '@/i18n'

const tokenInput = ref(getToken() ?? '')
const gistIdInput = ref(getGistId() ?? '')
const status = ref('')
const isLoading = ref(false)
const gistLink = ref(getGistId() ? `https://gist.github.com/${getGistId()}` : '')

function saveToken() {
  setToken(tokenInput.value || null)
  status.value = t('token_saved')
}

function saveGistId() {
  setGistId(gistIdInput.value || null)
  gistLink.value = gistIdInput.value ? `https://gist.github.com/${gistIdInput.value}` : ''
  status.value = t('gist_id_saved')
}

async function autoDetectGist() {
  isLoading.value = true
  status.value = t('searching_gists')
  try {
    const foundId = await searchWirysGists()
    if (foundId) {
      setGistId(foundId)
      gistIdInput.value = foundId
      gistLink.value = `https://gist.github.com/${foundId}`
      status.value = t('gist_detected')
    } else {
      status.value = t('no_gist_found')
    }
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}

async function syncNow() {
  isLoading.value = true
  status.value = t('syncing')
  try {
    await mergeWithGist()
    status.value = t('sync_complete')
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 border-t mt-4">
    <div class="font-semibold mb-3">{{ t('gist_sync_title') }}</div>

    <div class="space-y-3">
      <!-- Token -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('github_token') }}</label>
        <div class="flex gap-2">
          <input 
            v-model="tokenInput" 
            type="password" 
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500" 
            :placeholder="t('token_placeholder')"
          />
          <button @click="saveToken" class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            {{ t('save') }}
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">{{ t('tip_tokens') }}</p>
      </div>

      <!-- Gist ID -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('gist_id_label') }}</label>
        <div class="flex gap-2">
          <input 
            v-model="gistIdInput" 
            type="text" 
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500" 
            :placeholder="t('gist_id_placeholder')"
          />
          <button @click="saveGistId" class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            {{ t('save') }}
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button 
          @click="autoDetectGist" 
          :disabled="isLoading"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {{ t('auto_detect') }}
        </button>
        <button 
          @click="syncNow" 
          :disabled="isLoading"
          class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {{ t('sync_now') }}
        </button>
      </div>

      <!-- Gist Link -->
      <div v-if="gistLink" class="text-sm">
        <a :href="gistLink" target="_blank" class="text-primary-600 hover:underline flex items-center gap-1">
          {{ t('open_gist') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <!-- Status -->
      <div v-if="status" class="text-sm p-2 bg-gray-50 rounded border" :class="{ 'animate-pulse': isLoading }">
        {{ status }}
      </div>
    </div>
  </div>
</template>
