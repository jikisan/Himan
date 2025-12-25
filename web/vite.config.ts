import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/modules/core'),
      '@auth': path.resolve(__dirname, './src/modules/auth'),
      '@dashboard': path.resolve(__dirname, './src/modules/dashboard'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
})
