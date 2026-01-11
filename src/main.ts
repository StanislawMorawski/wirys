import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

if (import.meta.env.DEV) {
  // Log missing/empty translations during development
  import('@/i18n').then(m => m.logLocaleProblems()).catch(() => {})
}

app.mount('#app')
