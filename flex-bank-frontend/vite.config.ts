import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // All assets and routes are served under /bank/ so the gateway proxy works.
  base: '/bank/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      // Through LocalTunnel (HTTPS port 443), WebSocket must target port 443.
      clientPort: 443,
    },
  },
})
