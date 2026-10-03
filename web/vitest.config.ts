import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    // Bundle UI dependencies so workspace packages use the same React instance.
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: [
            'react-router-dom', 'motion/react', 'lucide-react', 'sonner', '@tanstack/react-query',
            '@radix-ui/react-scroll-area', '@radix-ui/react-tabs', '@radix-ui/react-dialog',
            '@radix-ui/react-select', '@radix-ui/react-slot',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-alert-dialog',
          ],
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
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
      '@grocery': path.resolve(__dirname, './src/modules/grocery'),
      '@career': path.resolve(__dirname, './src/modules/career'),
      '@profile': path.resolve(__dirname, './src/modules/profile'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
});
