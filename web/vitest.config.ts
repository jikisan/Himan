import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/modules/shared'),
      '@auth': path.resolve(__dirname, './src/modules/auth'),
      '@dashboard': path.resolve(__dirname, './src/modules/dashboard'),
      '@notes': path.resolve(__dirname, './src/modules/notes'),
      '@passwords': path.resolve(__dirname, './src/modules/passwords'),
      '@cards': path.resolve(__dirname, './src/modules/cards'),
      '@settings': path.resolve(__dirname, './src/modules/settings'),
      '@subscriptions': path.resolve(__dirname, './src/modules/subscriptions'),
      '@invoice-generator': path.resolve(__dirname, './src/modules/invoice-generator'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
});
