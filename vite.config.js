/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import compression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression()
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  server: {
    watch: {
      ignored: ['**/input/**', '**/processing/**'],
    },
  },
  build: {
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-animation';
            if (id.includes('@supabase')) return 'vendor-db';
            if (id.includes('@google/generative-ai')) return 'vendor-ai';

            return 'vendor-core';
          }

          // Feature-based splitting
          if (id.includes('src/features/reports')) return 'feature-reports';
          if (id.includes('src/features/course')) return 'feature-course';
          if (id.includes('src/features/quiz')) return 'feature-quiz';
        }
      }
    }
  }
})
