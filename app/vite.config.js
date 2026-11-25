import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The screens live in web/. "npm run build" puts the finished files in web/dist,
// which the server in server/ hands out. During "npm run dev" the screens run on
// port 5180 and /api requests are forwarded to the server on port 4000.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5180, proxy: { '/api': 'http://localhost:4000' } },
});
