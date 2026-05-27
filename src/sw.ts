/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Precache и маршрутизация для всех активов, собранных Vite
precacheAndRoute(self.__WB_MANIFEST);

// Очистка устаревших кэшей
cleanupOutdatedCaches();

// Немедленно активировать новый Service Worker
self.skipWaiting();
clientsClaim();

// === Push-уведомления (из оригинального sw.js) ===

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Напоминание из NoteBox',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
    requireInteraction: false,
    tag: 'notebox-reminder',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NoteBox', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Ищем открытое окно с приложением
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Отправляем сообщение для навигации
            return client.postMessage({
              type: 'NAVIGATE',
              url: url,
            });
          });
        }
      }
      // Если нет открытого окна, открываем новое
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
