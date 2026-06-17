import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
              // n8n returns an empty body on cross-origin POSTs; strip these
              // so the request looks same-origin to the webhook.
              for (const h of ['origin', 'referer', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-dest']) {
                proxyReq.removeHeader(h);
              }
            });
          },
        },
      },
    },
    preview: { port: 4173 },
  };
});
