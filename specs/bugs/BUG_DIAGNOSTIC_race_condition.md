# Диагностический отчёт: Race Condition в синхронизации заметок

**Дата:** 2026-05-23  
**Severity:** HIGH  
**Статус:** ДИАГНОСТИКА ЗАВЕРШЕНА  

---

## Bug Summary

При одновременных операциях create и update для одной заметки возникает race condition: обновление может использовать устаревший локальный ID до завершения создания на сервере, что приводит к дублированию заметок или потере данных.

---

## Root Cause

**Файл:** `src/services/offline/syncService.ts:26`

```typescript
for (const item of pendingItems) {
  try {
    await this.processSyncItem(item);
    await syncQueue.remove(item.id!);
  } catch (error) {
    // ...
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

**Проблема:** Глобальный FIFO цикл обрабатывает все операции последовательно БЕЗ per-note locking. Если для одной заметки в очереди есть CREATE и UPDATE, они обрабатываются без гарантии атомарности:

1. CREATE создаёт заметку с локальным UUID `abc-123`
2. Сервер возвращает новый ID `server-xyz`
3. UPDATE пытается обновить `abc-123`, который уже не существует
4. Результат: ошибка 404 или создание дубликата

**Вторая критическая точка:** `src/services/offline/offlineStore.ts:78`

```typescript
if (this.getIsOnline()) {
  syncService.processQueue().catch(error => {
    console.error('Failed to sync after create:', error);
  });  // ← Fire-and-forget! Не ждём завершения
}
```

---

## Consilium Findings

### Architect (Code Tracer)

**Согласен с root cause:** ДА

**Ключевые находки:**
- Отсутствие per-note locking в `syncService.processQueue()` (строка 26)
- Fire-and-forget вызовы `processQueue()` в `offlineStore.ts` (строки 78, 120)
- Нет ID mapping между локальным UUID и серверным UUID
- 100ms задержка между операциями недостаточна для API запросов
- Отдельные IndexedDB транзакции для `saveNote()` и `addToSyncQueue()`

**Сценарий гонки:**
```
T1: createNote() → id="local-abc" → syncQueue.add(CREATE)
T2: updateNote() → syncQueue.add(UPDATE для "local-abc")
T3: processQueue() → processSyncItem(CREATE) → сервер создаёт id="server-xyz"
T4: processSyncItem(UPDATE) → getNote("local-abc") → 404 или дубликат
```

### Stack Expert (Framework Analysis)

**Согласен с root cause:** ДА

**Ключевые находки:**
- Vue/Pinia не являются причиной бага — проблема архитектурная
- Отдельные IndexedDB транзакции создают окно для race condition
- Отсутствие sequence numbers для операций
- Слабое разрешение конфликтов на основе `updatedAt`
- CORS блокирует тестирование в браузере (отдельная проблема)

**Уязвимости IndexedDB:**
1. `saveNote()` и `addToSyncQueue()` — отдельные транзакции
2. Crash между транзакциями оставляет inconsistent state
3. Нет write-ahead logging для rollback

---

## Консенсус субагентов

| Аспект | Architect | Stack Expert | Согласие |
|--------|-----------|--------------|----------|
| Root cause: per-note locking | ДА | ДА | ✅ |
| Fire-and-forget processQueue | ДА | ДА | ✅ |
| Отдельные IndexedDB транзакции | ДА | ДА | ✅ |
| 100ms задержка недостаточна | ДА | ДА | ✅ |
| Нужен ID mapping | ДА | ДА | ✅ |

**Разногласий нет.** Оба субагента сходятся во мнении о первопричине и плане исправления.

---

## Reproduction Results

**Статус:** ❌ НЕ ВОСПРОИЗВЕДЁН (блокирующая проблема с CORS)

Тестирование в браузере заблокировано проблемой CORS конфигурации:
- POST `/api/auth/demo` возвращает 403 при наличии Origin заголовка
- Без входа в приложение невозможно протестировать функционал заметок

Однако баг **подтверждён анализом кода** — архитектура позволяет race condition.

---

## Affected Files

### Критический приоритет (MUST FIX)

| Файл | Строки | Проблема |
|------|--------|----------|
| `src/services/offline/syncService.ts` | 26-39 | Нет per-note locking |
| `src/services/offline/offlineStore.ts` | 78, 120 | Fire-and-forget sync |

### Высокий приоритет

| Файл | Строки | Проблема |
|------|--------|----------|
| `src/services/offline/syncQueue.ts` | — | Нет per-note методов |
| `src/services/offline/types.ts` | — | Нет sequence number |

### Средний приоритет

| Файл | Строки | Проблема |
|------|--------|----------|
| `src/stores/notesStore.ts` | 155-176 | Нет await для sync |
| `src/services/offline/indexedDb.ts` | 98-146 | Раздельные транзакции |

---

## Fix Plan

### Шаг 1: Добавить per-note locking в syncService (КРИТИЧЕСКИЙ)

**Файл:** `src/services/offline/syncService.ts`

**Изменение:** Группировать операции по `noteId` и обрабатывать последовательно для каждой заметки.

```typescript
// Псевдокод решения
private noteLocks = new Map<string, Promise<void>>();

async processQueue(): Promise<void> {
  const items = await syncQueue.getAll();
  const itemsByNote = groupByNoteId(items);
  
  for (const [noteId, noteItems] of itemsByNote) {
    // Ждём завершения предыдущей операции для этой заметки
    await this.noteLocks.get(noteId);
    
    const lockPromise = this.processNoteItems(noteId, noteItems);
    this.noteLocks.set(noteId, lockPromise);
    await lockPromise;
  }
}
```

### Шаг 2: Заменить fire-and-forget на await (КРИТИЧЕСКИЙ)

**Файл:** `src/services/offline/offlineStore.ts`

**Изменение:** Заменить `.catch()` на `await`:

```typescript
// Было
if (this.getIsOnline()) {
  syncService.processQueue().catch(error => {...});
}

// Должно быть
if (this.getIsOnline()) {
  await syncService.processQueue();
}
```

### Шаг 3: Добавить ID mapping (ВЫСОКИЙ)

**Файл:** `src/services/offline/syncService.ts`

**Изменение:** После CREATE обновить все pending UPDATE операции с новым server ID:

```typescript
private async syncCreate(item: SyncQueueItem): Promise<void> {
  const serverNote = await notesApi.create({...});
  
  // Обновляем все pending операции для этой заметки
  await syncQueue.updateNoteId(item.noteId, serverNote.id);
  
  await indexedDbService.saveNote(serverNote);
}
```

### Шаг 4: Добавить sequence numbers (ВЫСОКИЙ)

**Файл:** `src/services/offline/types.ts`

```typescript
interface SyncQueueItem {
  id?: number;
  noteId: string;
  operation: SyncOperation;
  sequence: number;  // Порядковый номер операции для заметки
  payload: Partial<Note>;
  timestamp: number;
  retryCount: number;
}
```

### Шаг 5: Объединить IndexedDB транзакции (СРЕДНИЙ)

**Файл:** `src/services/offline/indexedDb.ts`

**Изменение:** Создать метод `saveNoteAndQueue()` для атомарной операции в одной транзакции.

---

## Testing Strategy

### Unit Tests

1. **test_create_then_update_same_note**
   - Создать заметку
   - Немедленно обновить
   - Проверить: одна заметка на сервере с обновлённым содержимым

2. **test_rapid_multiple_updates**
   - Создать заметку
   - Отправить 5 обновлений за 50ms
   - Проверить: финальное состояние соответствует последнему обновлению

3. **test_create_update_offline_then_sync**
   - Создать заметку offline
   - Обновить offline
   - Восстановить соединение
   - Проверить: корректная синхронизация без дубликатов

### Integration Tests

4. **test_concurrent_create_delete**
   - Создать заметку
   - Немедленно удалить
   - Проверить: заметка не существует ни локально, ни на сервере

5. **test_sync_queue_ordering**
   - Заполнить очередь операциями для разных заметок
   - Проверить: операции для одной заметки выполняются в порядке добавления

### E2E Tests (после исправления CORS)

6. **test_browser_rapid_create_edit**
   - Открыть приложение в браузере
   - Создать заметку через UI
   - Быстро отредактировать
   - Проверить: нет дубликатов, данные корректны

---

## Risk Assessment

### Что может сломаться

1. **Performance degradation** — per-note locking может замедлить синхронизацию при большом количестве заметок
   - **Митигация:** Обрабатывать разные заметки параллельно, блокировать только операции для одной заметки

2. **Deadlock** — неправильная реализация locking может привести к deadlock
   - **Митигация:** Использовать timeout для блокировок, добавить логирование

3. **Backward compatibility** — изменение структуры `SyncQueueItem` требует миграции
   - **Митигация:** Добавить default значение для `sequence`, обработать отсутствие поля

4. **IndexedDB transaction timeout** — объединённые транзакции могут превысить timeout
   - **Митигация:** Тестировать с большими объёмами данных

### Риск НЕ исправлять

- **Потеря данных пользователей** — HIGH
- **Дублирование заметок** — HIGH
- **Inconsistent state** — HIGH
- **Негативный user experience** — HIGH

---

## Приложения

- `.diagnostic-results/architect.md` — полный отчёт архитектора
- `.diagnostic-results/stack-expert.md` — полный отчёт stack expert
- `.reproduction-evidence/reproduction-report.md` — отчёт о попытке воспроизведения
- `.reproduction-results.json` — структурированные данные воспроизведения

---

## Заключение

Race condition в синхронизации — **подтверждённый архитектурный баг** с HIGH severity. Оба субагента согласны с первопричиной: отсутствие per-note locking в `syncService.processQueue()` и fire-and-forget вызовы в `offlineStore`.

**Рекомендация:** Немедленно реализовать per-note locking (Шаги 1-2), затем улучшить ID mapping и sequence numbers (Шаги 3-4).
