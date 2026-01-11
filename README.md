# Wirys PWA

A Progressive Web App for tracking home chores, exercises, and more.

## Features

- 📋 **Track recurring tasks** - Chores, exercises, or any habit
- ⏰ **Flexible recurrence** - Daily, weekly, or monthly schedules  
- ✅ **One-click completion** - Mark tasks done instantly
- 📊 **Full history** - See all past completions with dates
- 🔴 **Overdue alerts** - Visual indicators for overdue items
- 📱 **PWA** - Install on any device, works offline
- 💾 **Local storage** - All data stored in browser (IndexedDB)

## Tech Stack

- Vue 3 + TypeScript
- Vite + vite-plugin-pwa
- Pinia (state management)
- Dexie.js (IndexedDB wrapper)
- Tailwind CSS

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is designed to be hosted on GitHub Pages or any static hosting:

1. Push to `main` branch
2. GitHub Actions will build and deploy automatically
3. Enable GitHub Pages in repo settings (Source: GitHub Actions)

## Data Storage

All data is stored locally in your browser using IndexedDB. No external services required!

### GitHub Gist sync (new)

You can optionally sync application data to a single JSON file stored in a GitHub Gist. This app supports two kinds of gist sync:

- **Full snapshot** — exports the entire DB (trackables, completions, groceries) to `wirys-data.json`.
- **Minimal snapshot (recommended)** — stores only chores with their **last completion timestamp** (to minimize data usage). The app will use gist revisions to reconstruct history when needed.

How to use:

- Create a personal access token at https://github.com/settings/tokens with the `gist` scope.
- Open **Settings → Gist Sync**, paste your token, and either provide an existing Gist ID or leave blank to create a private gist when saving.
- Use the **Minimal** Save/Load (merge or replace) for lightweight sync across devices.

Notes:

- Minimal snapshots only include chores and their last completion; previous completions remain in the full DB (or can be reconstructed from gist revisions).
- When **Load (replace)** is used, chores not present in the gist will be removed locally.
- Tokens and Gist ID are stored in `localStorage` (keys: `wirys_gist_token`, `wirys_gist_id`).

**To add other cloud sync later:**
- Firebase Firestore can be added for real-time sync between devices
- The architecture supports easy integration with external services

## License

MIT
