import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 3000 matches the API's default CORS_ORIGINS, so the two dev servers
// work together without extra configuration.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, strictPort: true, host: true },
  preview: { port: 3000, strictPort: true, host: true },
  build: { outDir: 'build' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
  },
});
