/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { photoCropper } from './tools/photoCropper.ts'
import { homePhotoTuner } from './tools/homePhotoTuner.ts'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Dev-only: /__crop/ crops the carousel photos, /__crop/compare compares two
    photoCropper({
      photosDir: here('./public/progress'),
      archiveDir: here('../progress-photos-archive'),
      pagePath: here('./tools/crop.html'),
      comparePagePath: here('./tools/compare.html'),
    }),
    // Dev-only: the home page's "Tune photos" panel saves its framing here
    homePhotoTuner({ dataPath: here('./src/lib/homePhotoFraming.json') }),
  ],
  server: {
    // Forward /api requests to the FastAPI backend so fetch("/api/...") works during development
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  preview: {
    // Same for `npm run preview`, which otherwise has no /api and silently
    // falls back to Open Beauty Facts alone
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  test: {
    // Placeholders so tests never need frontend/.env.local (which isn't in git);
    // the tests that touch Supabase replace the client with a fake anyway.
    env: {
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
