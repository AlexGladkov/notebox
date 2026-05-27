# F-0b340ebb: PWA с офлайн-режимом и Service Worker

## Статус
**Интервью не завершено** — MCP backend недоступен. Спецификация создана на основе анализа кодовой базы, референсной спецификации F-5cfcedfe и лучших практик PWA.

## Краткое описание

Превратить NoteBox в полноценное Progressive Web App (PWA) с возможностью установки на устройства и работы в офлайн-режиме. Основная цель — обеспечить кэширование статических ресурсов через Service Worker и создать Web App Manifest для установки на домашний экран.

## Контекст

### Что уже реализовано (F-5cfcedfe)
Офлайн-синхронизация данных уже работает:
- `src/services/offline/indexedDb.ts` — хранение заметок в IndexedDB
- `src/services/offline/syncQueue.ts` — очередь изменений для синхронизации
- `src/services/offline/syncService.ts` — синхронизация с сервером при восстановлении сети
- `src/services/offline/networkStatus.ts` — отслеживание состояния сети
- `src/components/SyncStatusIndicator.vue` — индикатор статуса в UI

### Что нужно добавить
1. **Service Worker** для кэширования статических ресурсов (JS, CSS, шрифты, иконки)
2. **Web App Manifest** для установки приложения
3. **PWA-иконки** разных размеров
4. **Интеграция vite-plugin-pwa** для автоматической генерации SW

## Предположения (требуют подтверждения)

1. **HTTPS не требуется для production** — приложение работает за nginx reverse proxy по HTTP. Service Worker будет работать только на localhost без HTTPS (ограничение браузеров).
2. **Стратегия кэширования**: Network First для API, Cache First для статики
3. **Размер иконок**: стандартный набор PWA (192x192, 512x512, maskable)
4. **Название приложения**: "NoteBox"
5. **Тема**: поддержка светлой и тёмной темы (theme_color адаптивный)

## Требования

### Функциональные требования

#### FR-1: Service Worker
- Регистрация Service Worker при загрузке приложения
- Кэширование всех статических ресурсов (JS, CSS, HTML, иконки, шрифты)
- Precaching критических ресурсов при установке SW
- Runtime caching для динамических запросов
- Автоматическое обновление SW при новой версии приложения

#### FR-2: Стратегии кэширования
| Тип ресурса | Стратегия | Описание |
|-------------|-----------|----------|
| index.html | Network First | Всегда пытаемся получить свежую версию |
| JS/CSS chunks | Cache First | Версионированные файлы, безопасно кэшировать |
| Шрифты | Cache First | Редко меняются |
| Изображения/иконки | Cache First | Статические ресурсы |
| API запросы | Network Only | Данные синхронизируются через IndexedDB |

#### FR-3: Web App Manifest
- Название: "NoteBox"
- Короткое название: "NoteBox"
- Описание: "Умный блокнот для организации заметок"
- Стартовый URL: динамический (зависит от VITE_BASE_PATH)
- Display mode: standalone
- Ориентация: any
- Цвет темы: адаптивный (светлый/тёмный)
- Цвет фона: адаптивный

#### FR-4: PWA-иконки
- 192x192 px (стандартная)
- 512x512 px (для splash screen)
- Maskable иконки для Android (безопасная зона)
- Apple Touch Icon для iOS

#### FR-5: Установка приложения
- Показывать кнопку "Установить" когда браузер поддерживает PWA
- Обрабатывать событие `beforeinstallprompt`
- Показывать подсказку об установке на мобильных устройствах

### Нефункциональные требования

#### NFR-1: Производительность
- Время загрузки из кэша: < 1 секунда
- Service Worker не должен блокировать основной поток
- Размер precache: < 2 MB

#### NFR-2: Совместимость
- Chrome 80+, Firefox 80+, Safari 14+, Edge 80+
- iOS Safari (ограниченная поддержка PWA)
- Graceful degradation для браузеров без SW

#### NFR-3: Обновления
- Уведомление пользователя о новой версии приложения
- Возможность обновить без потери данных
- Автоматическое обновление в фоне

## Архитектура

### Структура Service Worker

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Worker                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Precache      │    │  Runtime Cache  │                │
│  │   (при install) │    │  (при fetch)    │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────┐               │
│  │           Cache Storage API              │               │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │               │
│  │  │ Static  │  │ Assets  │  │ Runtime │  │               │
│  │  │  Cache  │  │  Cache  │  │  Cache  │  │               │
│  │  └─────────┘  └─────────┘  └─────────┘  │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Взаимодействие компонентов

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│    Service   │────▶│    Server    │
│   (fetch)    │◀────│    Worker    │◀────│   (origin)   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Cache     │
                    │   Storage    │
                    └──────────────┘
```

## Файлы для создания/изменения

### Новые файлы

| Файл | Описание |
|------|----------|
| `public/manifest.webmanifest` | Web App Manifest |
| `public/icons/icon-192x192.png` | PWA иконка 192x192 |
| `public/icons/icon-512x512.png` | PWA иконка 512x512 |
| `public/icons/icon-maskable-192x192.png` | Maskable иконка 192x192 |
| `public/icons/icon-maskable-512x512.png` | Maskable иконка 512x512 |
| `public/icons/apple-touch-icon.png` | Иконка для iOS (180x180) |
| `src/composables/usePWA.ts` | Composable для работы с PWA (установка, обновления) |
| `src/components/PWAInstallPrompt.vue` | Компонент предложения установки |
| `src/components/PWAUpdatePrompt.vue` | Компонент уведомления об обновлении |

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `package.json` | Добавить vite-plugin-pwa |
| `vite.config.ts` | Настроить vite-plugin-pwa |
| `index.html` | Добавить ссылку на manifest, meta-теги для iOS |
| `src/App.vue` | Интегрировать PWA-компоненты, удалить ручную регистрацию SW |

## Детали реализации

### 1. Установка vite-plugin-pwa

```bash
npm install -D vite-plugin-pwa
```

### 2. Конфигурация vite.config.ts

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: normalizePath(process.env.VITE_BASE_PATH),
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt', // Показывать prompt для обновления
      includeAssets: ['favicon.ico', 'icons/*.png'],
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
              }
            }
          }
        ]
      }
    })
  ]
});
```

### 3. Composable usePWA

```typescript
// src/composables/usePWA.ts
import { ref, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

export function usePWA() {
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const canInstall = ref(false);
  const isInstalled = ref(false);

  const {
    needRefresh,
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    }
  });

  onMounted(() => {
    // Проверяем, установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true;
    }

    // Слушаем событие beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      installPrompt.value = e as BeforeInstallPromptEvent;
      canInstall.value = true;
    });

    // Слушаем успешную установку
    window.addEventListener('appinstalled', () => {
      installPrompt.value = null;
      canInstall.value = false;
      isInstalled.value = true;
    });
  });

  const install = async () => {
    if (!installPrompt.value) return;
    
    installPrompt.value.prompt();
    const { outcome } = await installPrompt.value.userChoice;
    
    if (outcome === 'accepted') {
      installPrompt.value = null;
      canInstall.value = false;
    }
  };

  return {
    canInstall,
    isInstalled,
    needRefresh,
    install,
    updateServiceWorker
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

### 4. Обновление index.html

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NoteBox</title>
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1f2937" media="(prefers-color-scheme: dark)">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="NoteBox">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    
    <!-- Theme script -->
    <script>
      (function() {
        try {
          const theme = localStorage.getItem('notebox-theme') || 'system';
          const isDark = theme === 'dark' ||
            (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.classList.add('dark');
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 5. Генерация иконок

Для генерации иконок использовать исходное изображение (логотип NoteBox) и инструмент:
- https://realfavicongenerator.net/ или
- npm package `pwa-asset-generator`

Если нет исходного изображения, создать простую иконку:
- Синий квадрат (#3b82f6) с белой буквой "N"
- Или иконка блокнота в стиле приложения

## Критерии приёмки

### AC-1: Service Worker
- [ ] Service Worker регистрируется успешно при загрузке приложения
- [ ] Статические ресурсы кэшируются после первого посещения
- [ ] Приложение загружается офлайн (без интернета)
- [ ] При обновлении SW пользователь видит уведомление

### AC-2: Web App Manifest
- [ ] Manifest доступен по пути /manifest.webmanifest
- [ ] Браузер предлагает установить приложение (Chrome/Edge)
- [ ] Иконки отображаются корректно на разных устройствах

### AC-3: Установка
- [ ] Приложение устанавливается на Android через Chrome
- [ ] Приложение добавляется на домашний экран iOS
- [ ] После установки открывается как standalone приложение

### AC-4: Офлайн-режим
- [ ] Приложение полностью работает офлайн (вместе с F-5cfcedfe)
- [ ] Создание/редактирование заметок работает офлайн
- [ ] Изменения синхронизируются при восстановлении сети

### AC-5: Совместимость с окружением развёртывания
- [ ] PWA работает при развёртывании на subpath (/<project-slug>/)
- [ ] Service Worker корректно работает с BASE_PATH
- [ ] Manifest использует относительные пути

## Граничные случаи и риски

### Edge Cases

1. **HTTP без HTTPS на production**
   - Service Worker требует HTTPS (кроме localhost)
   - Решение: документировать ограничение, работает на localhost для разработки
   - Если нужен PWA на production — требуется настройка HTTPS

2. **Конфликт кэшей при обновлении**
   - Старая версия SW может отдавать устаревшие ресурсы
   - Решение: версионирование кэшей, автоматическая очистка старых

3. **Safari/iOS ограничения**
   - Service Worker имеет ограниченный срок жизни
   - Нет поддержки push-уведомлений
   - Решение: graceful degradation, информировать пользователя

4. **Изменение BASE_PATH**
   - При изменении пути SW и manifest нужно пересобрать
   - Решение: все пути относительные, конфигурируются через env

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| SW не работает без HTTPS | Высокая | Критическое | Документация, localhost для dev |
| Устаревший кэш | Средняя | Среднее | Версионирование, prompt для обновления |
| Большой размер кэша | Низкая | Низкое | Ограничение размера precache |
| iOS ограничения | Высокая | Среднее | Graceful degradation |

## Вне области действия (Out of Scope)

1. **Push-уведомления** — отдельная задача, требует backend
2. **Background Sync API** — расширенная синхронизация в фоне
3. **Периодическая фоновая синхронизация** — Periodic Background Sync API
4. **Кэширование изображений пользователя** — только статические ресурсы
5. **Шифрование кэша** — отдельная задача безопасности

## Развёртывание

### Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `VITE_BASE_PATH` | Базовый путь приложения | `/` |

### Совместимость с окружением

- **Subpath**: Все пути в manifest и SW должны быть относительными
- **HTTP**: Service Worker не будет работать (ограничение браузеров)
- **Cookies**: Не влияет на PWA функциональность

### Build

```bash
npm run build
```

Сгенерирует:
- `dist/sw.js` — Service Worker
- `dist/manifest.webmanifest` — Web App Manifest  
- `dist/workbox-*.js` — Workbox runtime

## Зависимости от других задач

- **F-5cfcedfe** (офлайн-синхронизация) — уже реализована, интегрируется с данным PWA
- Удалить ручную регистрацию SW из App.vue (будет через vite-plugin-pwa)

---

**Примечание**: Данная спецификация создана без проведения интервью. Основные вопросы для уточнения:
1. Требуется ли HTTPS для production? (влияет на работу SW)
2. Есть ли исходные изображения для PWA-иконок?
3. Нужен ли prompt для установки или автоматическое предложение?
4. Приоритеты: что важнее — установка или офлайн-режим?
