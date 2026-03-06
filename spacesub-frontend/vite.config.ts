import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      // Client auto-detects host from page URL (works for localhost and ngrok).
      host: undefined,
    },
    proxy: {
      // /api/* → SpaceSub backend (port 3000)
      // No rewrite — backend uses globalPrefix('api'), routes match as-is
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // /bank-api/* → Flex Bank API (port 3001), strip prefix
      // MUST appear before /bank to avoid prefix collision
      '/bank-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bank-api/, ''),
      },
      // /bank/* → Flex Bank frontend (port 5173)
      // No rewrite — Flex Bank Vite serves with base: '/bank/'
      '/bank': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
