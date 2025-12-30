/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  server: {
    watch: {
      ignored: ['**/input/**', '**/scripts/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - cached separately
          'react-vendor': ['react', 'react-dom'],
          // Charts library (large)
          'recharts': ['recharts'],
          // UI components
          'radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot'
          ],
          // Animation
          'framer': ['framer-motion'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // AI
          'gemini': ['@google/generative-ai']
        }
      }
    }
  }
})
