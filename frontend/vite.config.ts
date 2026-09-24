import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to Flask so fetch("/api/...") works during development
    proxy: {
      "/api": "http://localhost:5001",
    },
  },
})
