import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the backend so the browser never deals with CORS.
      '/api': 'http://localhost:8787',
    },
  },
});
