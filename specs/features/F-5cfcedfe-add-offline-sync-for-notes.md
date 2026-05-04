# F-5cfcedfe: Офлайн-синхронизация заметок

## Статус
**Интервью не завершено** — MCP backend недоступен. Спецификация создана на основе анализа кодовой базы и лучших практик.

## Краткое описание

Добавить возможность работы с заметками в офлайн-режиме с автоматической синхронизацией при восстановлении соединения. Пользователи смогут просматривать, создавать и редактировать заметки без интернет-соединения.

## Предположения (требуют подтверждения)

Поскольку интервью не было проведено, приняты следующие предположения:

1. **Режим работы**: Гибридный — кэширование для чтения офлайн + очередь изменений на синхронизацию
2. **Объём данных**: Кэшируются все заметки пользователя (предполагается разумный объём)
3. **Разрешение конфликтов**: Last-write-wins на уровне заметки (не на уровне полей)
4. **Файлы и вложения**: Не кэшируются в первой версии (только метаданные)
5. **Базы данных (CustomDatabase)**: Не включены в офлайн-синхронизацию в первой версии
6. **Теги**: Синхронизируются вместе с заметками

## Требования

### Функциональные требования

#### FR-1: Локальное хранилище
- Все заметки пользователя сохраняются в IndexedDB при загрузке
- При открытии приложения данные загружаются из локального кэша (instant load)
- Фоновая синхронизация с сервером обновляет локальный кэш

#### FR-2: Офлайн-редактирование
- Создание новых заметок работает офлайн (генерация UUID на клиенте)
- Редактирование существующих заметок работает офлайн
- Удаление заметок работает офлайн
- Перемещение заметок (изменение parentId) работает офлайн

#### FR-3: Очередь синхронизации
- Все изменения, сделанные офлайн, сохраняются в очередь
- При восстановлении соединения очередь обрабатывается последовательно
- Повторные попытки при ошибках синхронизации (exponential backoff)

#### FR-4: Разрешение конфликтов
- Стратегия: last-write-wins на основе `updatedAt`
- При конфликте серверная версия имеет приоритет если `server.updatedAt > local.updatedAt`
- Локальные изменения применяются если `local.updatedAt > server.updatedAt`

#### FR-5: Индикация статуса
- Индикатор сетевого соединения в UI
- Индикатор статуса синхронизации (synced / syncing / pending / error)
- Количество несинхронизированных изменений
- Визуальная метка на заметках с локальными изменениями

### Нефункциональные требования

#### NFR-1: Производительность
- Время загрузки из кэша: < 100ms для 1000 заметок
- Синхронизация не должна блокировать UI

#### NFR-2: Надёжность
- Данные в IndexedDB не должны теряться при обновлении страницы
- Очередь синхронизации должна выживать перезагрузку браузера

#### NFR-3: Ограничения хранилища
- Предупреждение при приближении к лимиту IndexedDB (> 80%)
- Graceful degradation при исчерпании места

## Архитектура

### Структура IndexedDB

```
Database: notebox-offline
├── Store: notes
│   ├── key: id (string)
│   └── indexes: [parentId, updatedAt]
├── Store: syncQueue
│   ├── key: auto-increment
│   └── indexes: [noteId, timestamp]
└── Store: metadata
    └── key: name (lastSyncTime, schemaVersion, etc.)
```

### Модель данных syncQueue

```typescript
interface SyncQueueItem {
  id: number;           // auto-increment
  noteId: string;
  operation: 'create' | 'update' | 'delete' | 'move';
  payload: Partial<Note>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}
```

### Поток данных

```
┌─────────────────────────────────────────────────────────────┐
│                        Vue App                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  useNotes   │───▶│OfflineStore│───▶│  SyncQueue  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                   │            │
│         │                  ▼                   │            │
│         │           ┌───────────┐              │            │
│         │           │ IndexedDB │              │            │
│         │           └───────────┘              │            │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌─────────────┐                       ┌─────────────┐     │
│  │  notesApi   │◀──────────────────────│ SyncService │     │
│  └─────────────┘                       └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Server    │
                    └─────────────┘
```

## Файлы для создания/изменения

### Новые файлы

| Файл | Описание |
|------|----------|
| `src/services/offline/indexedDb.ts` | Обёртка над IndexedDB API |
| `src/services/offline/offlineStore.ts` | Управление локальным хранилищем заметок |
| `src/services/offline/syncQueue.ts` | Очередь синхронизации |
| `src/services/offline/syncService.ts` | Сервис синхронизации с сервером |
| `src/services/offline/networkStatus.ts` | Отслеживание состояния сети |
| `src/services/offline/types.ts` | Типы для офлайн-функциональности |
| `src/composables/useOffline.ts` | Composable для работы с офлайн-режимом |
| `src/composables/useNetworkStatus.ts` | Composable для статуса сети |
| `src/components/SyncStatusIndicator.vue` | Компонент индикатора синхронизации |

### Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/composables/useStorage.ts` | Интеграция с offlineStore, загрузка из кэша |
| `src/composables/useNotes.ts` | Добавление в syncQueue при изменениях |
| `src/api/notes.ts` | Обёртка для работы через офлайн-слой |
| `src/App.vue` | Добавление SyncStatusIndicator |
| `src/components/UnifiedSidebar.vue` | Метка для несинхронизированных заметок |

## Детали реализации

### 1. IndexedDB Service (`src/services/offline/indexedDb.ts`)

```typescript
class IndexedDbService {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void>
  async getAllNotes(): Promise<Note[]>
  async saveNote(note: Note): Promise<void>
  async deleteNote(id: string): Promise<void>
  async addToSyncQueue(item: SyncQueueItem): Promise<void>
  async getSyncQueue(): Promise<SyncQueueItem[]>
  async removeSyncQueueItem(id: number): Promise<void>
  async getMetadata(key: string): Promise<any>
  async setMetadata(key: string, value: any): Promise<void>
}
```

### 2. Offline Store (`src/services/offline/offlineStore.ts`)

```typescript
class OfflineStore {
  async loadFromCache(): Promise<Note[]>
  async saveToCache(notes: Note[]): Promise<void>
  async syncWithServer(): Promise<void>
  async createNote(note: CreateNoteRequest): Promise<Note>
  async updateNote(id: string, updates: UpdateNoteRequest): Promise<Note>
  async deleteNote(id: string): Promise<void>
}
```

### 3. Sync Service (`src/services/offline/syncService.ts`)

```typescript
class SyncService {
  private isProcessing = false;
  
  async processQueue(): Promise<void>
  async syncNote(item: SyncQueueItem): Promise<void>
  async handleConflict(local: Note, server: Note): Promise<Note>
  async fullSync(): Promise<void>
}
```

### 4. Network Status (`src/services/offline/networkStatus.ts`)

```typescript
const useNetworkStatus = () => {
  const isOnline = ref(navigator.onLine);
  const lastOnlineTime = ref<number | null>(null);
  
  // Listen to online/offline events
  // Periodic connectivity checks via fetch
}
```

## Критерии приёмки

### AC-1: Базовая офлайн-работа
- [ ] Приложение загружается и показывает заметки без интернета
- [ ] Можно создать новую заметку офлайн
- [ ] Можно редактировать заметку офлайн
- [ ] Можно удалить заметку офлайн

### AC-2: Синхронизация
- [ ] При восстановлении соединения изменения отправляются на сервер
- [ ] Новые заметки с сервера появляются в приложении
- [ ] Изменения с сервера применяются к локальным заметкам
- [ ] Удалённые на сервере заметки удаляются локально

### AC-3: Индикация статуса
- [ ] Отображается индикатор offline/online
- [ ] Отображается количество несинхронизированных изменений
- [ ] Заметки с локальными изменениями визуально отмечены

### AC-4: Устойчивость к ошибкам
- [ ] Ошибки синхронизации не приводят к потере данных
- [ ] Повторные попытки синхронизации работают
- [ ] Данные сохраняются при перезагрузке страницы

## Граничные случаи и риски

### Edge Cases

1. **Одновременное редактирование на нескольких устройствах**
   - Решение: last-write-wins, возможна потеря промежуточных изменений
   
2. **Создание заметки офлайн, удаление родителя онлайн**
   - Решение: orphan заметки перемещаются в корень

3. **Конфликт при удалении**
   - Решение: если заметка удалена на сервере, локальные изменения теряются (с предупреждением)

4. **Переполнение IndexedDB**
   - Решение: предупреждение пользователя, приоритизация синхронизации

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Потеря данных при конфликтах | Средняя | Высокое | Логирование конфликтов, возможность восстановления |
| Проблемы с IndexedDB в Safari | Низкая | Среднее | Fallback на localStorage для метаданных |
| Слишком большой объём данных | Низкая | Среднее | Ленивая загрузка контента |

## Вне области действия (Out of Scope)

1. **Кэширование файлов и изображений** — только метаданные
2. **Офлайн-синхронизация баз данных (CustomDatabase)** — отдельная задача
3. **Коллаборативное редактирование в реальном времени** — требует CRDT/OT
4. **Шифрование локальных данных** — отдельная задача безопасности
5. **Выборочная синхронизация** — все заметки синхронизируются
6. **Service Worker / PWA** — может быть добавлен позже

## Развёртывание

### Переменные окружения

Нет новых переменных окружения. Используется относительный путь API.

### Совместимость

- IndexedDB поддерживается во всех современных браузерах
- Graceful degradation для браузеров без IndexedDB (только онлайн-режим)

## Миграция данных

При первом запуске с новой функциональностью:
1. Загрузить все заметки с сервера
2. Сохранить в IndexedDB
3. Установить `lastSyncTime` в metadata

---

**Примечание**: Данная спецификация создана без проведения интервью с заказчиком. Перед началом реализации рекомендуется подтвердить предположения, особенно:
- Стратегию разрешения конфликтов
- Объём данных для кэширования
- Приоритет функций (что важнее всего)
