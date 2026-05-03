import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.23.0.4:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://172.23.0.4:8080',
        changeOrigin: true,
      },
    },
  },
})
