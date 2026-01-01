# Home Tracker PWA

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

**To add cloud sync later:**
- Firebase Firestore can be added for real-time sync between devices
- The architecture supports easy integration with external services

## License

MIT
