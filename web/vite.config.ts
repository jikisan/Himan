import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/modules/shared'),
      '@auth': path.resolve(__dirname, './src/modules/auth'),
      '@dashboard': path.resolve(__dirname, './src/modules/dashboard'),
      '@notes': path.resolve(__dirname, './src/modules/notes'),
      '@passwords': path.resolve(__dirname, './src/modules/passwords'),
      '@cards': path.resolve(__dirname, './src/modules/cards'),
      '@storage': path.resolve(__dirname, './src/modules/storage'),
      '@settings': path.resolve(__dirname, './src/modules/settings'),
      '@subscriptions': path.resolve(__dirname, './src/modules/subscriptions'),
      '@invoice-generator': path.resolve(__dirname, './src/modules/invoice-generator'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
    dedupe: ['react', 'react-dom', '@supabase/supabase-js'],
  },
  optimizeDeps: {
    include: ['@tanstack/react-query'],
  },
})
