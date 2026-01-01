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
            // Core React and internals should stay together
            if (id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('prop-types') ||
              id.includes('react-dom')) {
              return 'vendor-react';
            }

            // Large stable libraries
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-animation';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-db';
            if (id.includes('@radix-ui')) return 'vendor-ui';

            return 'vendor-others';
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
