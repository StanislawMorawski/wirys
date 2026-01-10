<script setup lang="ts">
import { ref } from 'vue'
import { getToken, setToken, getGistId, setGistId, fetchCurrentGistSnapshot, upsertCurrentGist, fetchCurrentMinimalSnapshot, upsertCurrentMinimalGist } from '@/services/gistStorage'
import { exportSnapshot, importSnapshot, exportMinimalSnapshot, importMinimalSnapshot } from '@/db/sync'

const tokenInput = ref(getToken() ?? '')
const gistIdInput = ref(getGistId() ?? '')
const status = ref('')
const isLoading = ref(false)
const gistLink = ref(getGistId() ? `https://gist.github.com/${getGistId()}` : '')

function saveToken() {
  setToken(tokenInput.value || null)
  status.value = 'Token saved locally.'
}

function saveGistId() {
  setGistId(gistIdInput.value || null)
  gistLink.value = gistIdInput.value ? `https://gist.github.com/${gistIdInput.value}` : ''
  status.value = 'Gist ID saved.'
}

async function saveToGist() {
  isLoading.value = true
  status.value = 'Exporting snapshot...'
  try {
    const snapshot = await exportSnapshot()
    const res = await upsertCurrentGist(snapshot)
    // res may include id
    if (res?.id) {
      setGistId(res.id)
      gistIdInput.value = res.id
      gistLink.value = `https://gist.github.com/${res.id}`
    }
    status.value = 'Saved to gist.'
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}

async function loadFromGist() {
  isLoading.value = true
  status.value = 'Fetching gist...'
  try {
    const id = gistIdInput.value || getGistId()
    if (!id) throw new Error('No gist id provided')
    setGistId(id)
    const snap = await fetchCurrentGistSnapshot()
    if (!snap) throw new Error('No snapshot found')
    await importSnapshot(snap)
    status.value = 'Imported snapshot from gist.'
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}

async function saveMinimal() {
  isLoading.value = true
  status.value = 'Exporting minimal snapshot...'
  try {
    const snapshot = await exportMinimalSnapshot()
    const res = await upsertCurrentMinimalGist(snapshot)
    if (res?.id) {
      setGistId(res.id)
      gistIdInput.value = res.id
      gistLink.value = `https://gist.github.com/${res.id}`
    }
    status.value = 'Saved minimal snapshot to gist.'
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}

async function loadMinimalReplace() {
  isLoading.value = true
  status.value = 'Fetching minimal gist...'
  try {
    const id = gistIdInput.value || getGistId()
    if (!id) throw new Error('No gist id provided')
    setGistId(id)
    const snap = await fetchCurrentMinimalSnapshot()
    if (!snap) throw new Error('No snapshot found')
    await importMinimalSnapshot(snap, 'replace')
    status.value = 'Imported minimal snapshot (replace).' 
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}

async function loadMinimalMerge() {
  isLoading.value = true
  status.value = 'Fetching minimal gist...'
  try {
    const id = gistIdInput.value || getGistId()
    if (!id) throw new Error('No gist id provided')
    setGistId(id)
    const snap = await fetchCurrentMinimalSnapshot()
    if (!snap) throw new Error('No snapshot found')
    await importMinimalSnapshot(snap, 'merge')
    status.value = 'Imported minimal snapshot (merge).' 
  } catch (e: any) {
    status.value = `Error: ${e.message}`
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-3 text-sm w-full">
    <div class="font-semibold mb-2">Gist Sync</div>

    <div class="text-xs text-gray-600 mb-2">Store synced metadata in a GitHub Gist file.</div>

    <label class="text-xs">GitHub Token (scopes: gist)</label>
    <input v-model="tokenInput" type="password" class="w-full px-2 py-1 border rounded mb-2" />
    <div class="flex gap-2 mb-2">
      <button @click="saveToken" class="flex-1 px-2 py-1 bg-primary-600 text-white rounded">Save token</button>
      <button @click="tokenInput=''; saveToken()" class="px-2 py-1 border rounded">Clear</button>
    </div>

    <label class="text-xs">Gist ID (leave empty to create)</label>
    <div class="flex gap-2 mb-2">
      <input v-model="gistIdInput" type="text" class="flex-1 px-2 py-1 border rounded" />
      <button @click="saveGistId" class="px-3 py-1 border rounded">Save ID</button>
    </div>

    <div class="flex gap-2 mb-2">
      <button @click="saveToGist" :disabled="isLoading" class="flex-1 px-2 py-1 bg-primary-600 text-white rounded">Save full snapshot</button>
      <button @click="loadFromGist" :disabled="isLoading" class="px-2 py-1 border rounded">Load full snapshot</button>
    </div>

    <div class="text-xs text-gray-500 mb-2">Minimal sync (chores only):</div>
    <div class="flex gap-2 mb-2">
      <button @click="saveMinimal" :disabled="isLoading" class="flex-1 px-2 py-1 bg-green-600 text-white rounded">Save minimal (last completions)</button>
      <button @click="loadMinimalReplace" :disabled="isLoading" class="px-2 py-1 border rounded">Load (replace)</button>
      <button @click="loadMinimalMerge" :disabled="isLoading" class="px-2 py-1 border rounded">Load (merge)</button>
    </div>

    <div class="text-xs text-gray-500">Status: <span class="font-medium">{{ status }}</span></div>

    <div v-if="gistLink" class="text-xs mt-2"><a :href="gistLink" target="_blank" class="underline">Open gist</a></div>

    <div class="mt-2 text-xs text-gray-500">Tip: create a token at <a class="underline" href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a> with the <code>gist</code> scope.</div>
  </div>
</template>
