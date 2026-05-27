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

export default defineConfig({
  base: normalizePath(process.env.VITE_BASE_PATH),
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
        start_url: '.',
        scope: '.',
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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 год
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: null, // Отключаем для SPA, т.к. используем vue-router
        cleanupOutdatedCaches: true
      },
      // Стратегия: generateSW для автоматической генерации SW с кастомным кодом
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
