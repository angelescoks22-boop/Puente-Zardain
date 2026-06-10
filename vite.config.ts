import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // OneDrive / Windows: evita crashes del watcher de archivos
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        timeout: 30_000,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        timeout: 30_000,
      },
    },
  },
})
