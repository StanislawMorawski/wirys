<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mergeWithGist } from '@/db/sync'
import { searchWirysGists, setGistId, getGistId } from '@/services/gistStorage'
import { t } from '@/i18n'
import { changeTracker } from '@/db/changes'

const syncing = ref(false)
const pendingChanges = ref(0)

const emit = defineEmits<{
  synced: []
}>()

function updatePendingCount() {
  pendingChanges.value = changeTracker.getChangeCount()
}

onMounted(() => {
  updatePendingCount()
  // Update count every few seconds
  setInterval(updatePendingCount, 3000)
})

async function runSync() {
  syncing.value = true
  try {
    // Auto-detect gist if not set
    if (!getGistId()) {
      const foundId = await searchWirysGists()
      if (foundId) {
        setGistId(foundId)
      }
    }

    await mergeWithGist()
    updatePendingCount()
    emit('synced')
  } catch (e: any) {
    alert(`Sync error: ${e.message}`)
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <button
    @click="runSync"
    :disabled="syncing"
    class="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2 relative"
    :title="t('sync')"
  >
    <svg 
      class="w-4 h-4" 
      :class="{ 'animate-spin': syncing }"
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0112.95-6.64M20 14a8 8 0 01-12.95 6.64" 
      />
    </svg>
    <span v-if="!syncing" class="hidden sm:inline">{{ t('sync') }}</span>
    <span v-else class="hidden sm:inline">{{ t('syncing') }}</span>
    
    <!-- Pending changes badge -->
    <span 
      v-if="pendingChanges > 0 && !syncing" 
      class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
    >
      {{ pendingChanges > 9 ? '9+' : pendingChanges }}
    </span>
  </button>
</template>
