import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    // Allow any Host header (required for LocalTunnel domains)
    allowedHosts: true,
    cors: true,
    hmr: process.env.TUNNEL
      ? { clientPort: 443 }  // Through LocalTunnel (HTTPS), WebSocket must use port 443
      : true,                // Local dev — Vite auto-detects
    proxy: {
      // /api/* → SpaceSub backend (port 3000)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // /bank-api/* → Flex Bank API (port 3001), strip prefix
      '/bank-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bank-api/, ''),
      },
      // /bank/* → Flex Bank frontend (port 5173)
      '/bank': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
