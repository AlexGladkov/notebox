import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Нормализация base path: гарантирует что путь начинается и заканчивается на /
const normalizePath = (path: string | undefined): string => {
  if (!path || path === '/') return '/';
  // Убедиться что путь начинается с /
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Убедиться что путь заканчивается на /
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};

export default defineConfig({
  base: normalizePath(process.env.VITE_BASE_PATH),
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
