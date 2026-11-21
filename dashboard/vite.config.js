import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development (npm run dev) the dashboard runs on port 5173 and
// forwards /api requests to the Node bridge on port 3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
