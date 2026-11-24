import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendProxy = {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
  '/shots': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: backendProxy,
  },
  preview: {
    port: 4173,
    proxy: backendProxy,
  },
})
