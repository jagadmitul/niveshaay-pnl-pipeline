import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// =============================================================================
// Local dev: proxies /api/process-pdf to the n8n webhook on localhost:5678.
// Production: Vercel handles the same rewrite via vercel.json.
// =============================================================================

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.VITE_N8N_BASE_URL || 'http://localhost:5678';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api/process-pdf': {
          target,
          changeOrigin: true,
          rewrite: () => '/webhook/process-pdf',
          timeout: 180_000,
          proxyTimeout: 180_000,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              proxyReq.removeHeader('sec-fetch-mode');
              proxyReq.removeHeader('sec-fetch-site');
              proxyReq.removeHeader('sec-fetch-dest');
            });
          },
        },
      },
    },
    preview: {
      port: 4173,
    },
  };
});
