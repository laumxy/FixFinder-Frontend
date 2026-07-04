import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Proxy /api/engine/* → Python FastAPI backend (strips /api/engine prefix).
        // e.g. GET /api/engine/health      → GET  http://127.0.0.1:8000/health
        //      POST /api/engine/diagnose   → POST http://127.0.0.1:8000/diagnose
        //      GET  /api/engine/analytics  → GET  http://127.0.0.1:8000/analytics
        '/api/engine': {
          target: pythonBackendUrl,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/engine/, ''),
        },
      },
    },
  };
});
