import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Нормализация base path: гарантирует что путь начинается и заканчивается на /
const normalizePath = (path: string | undefined): string => {
  if (!path || path === '/') return '/';
  // Убедиться что путь начинается с /
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Убедиться что путь заканчивается на /
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};

const base = normalizePath(process.env.VITE_BASE_PATH);

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png', '*.png'],
      manifest: {
        name: 'NoteBox',
        short_name: 'NoteBox',
        description: 'Умный блокнот для организации заметок',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // navigateFallback отключен для корректной работы vue-router
        navigateFallback: null,
        cleanupOutdatedCaches: true
      },
      // Стратегия: injectManifest для использования кастомного Service Worker с Workbox
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      devOptions: {
        enabled: false, // Отключаем в dev-режиме для упрощения разработки
        type: 'module'
      }
    })
  ],
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
