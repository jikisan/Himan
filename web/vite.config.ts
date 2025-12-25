import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/modules/shared'),
      '@auth': path.resolve(__dirname, './src/modules/auth'),
      '@dashboard': path.resolve(__dirname, './src/modules/dashboard'),
      '@notes': path.resolve(__dirname, './src/modules/notes'),
      '@settings': path.resolve(__dirname, './src/modules/settings'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
})
