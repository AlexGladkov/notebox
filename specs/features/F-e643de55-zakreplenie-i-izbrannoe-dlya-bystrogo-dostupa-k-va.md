# Спецификация: Закрепление и избранное для быстрого доступа к важным страницам

**ID:** F-e643de55  
**Статус:** Draft  
**Дата:** 2026-05-29

## Краткое описание

Добавить возможность помечать страницы как избранные с отображением в отдельной секции сайдбара и быстрым доступом через Command Palette.

## Требования из задачи

### Критерии приёмки (из описания задачи)

1. **Кнопка/иконка звезды** для добавления страницы в избранное
2. **Секция "Избранное"** в верхней части сайдбара
3. **Синхронизация** избранных страниц между устройствами
4. **Быстрый доступ** к избранным через Command Palette (Ctrl+K)

### Интерпретация требований

> *Примечание: Интервью с пользователем не удалось провести (MCP backend недоступен). Решения приняты на основе анализа кодовой базы и best practices.*

- **"Закрепление и избранное"** трактуется как единая функция: пометка звёздочкой добавляет страницу в секцию "Избранное" вверху сайдбара
- Избранное синхронизируется через существующий механизм offline-first sync (offlineStore + syncQueue)
- В Command Palette добавляется секция "Избранное" с теми же страницами

## Архитектурный анализ

### Текущая структура

```
src/
├── types/index.ts          # Note interface
├── api/notes.ts            # REST API endpoints
├── stores/notesStore.ts    # Pinia store с Offline-first sync
├── services/offline/       # offlineStore, syncQueue, indexedDb
├── composables/
│   └── useCommandPalette.ts # Логика Command Palette
├── components/
│   ├── CommandPalette.vue  # UI палитры команд
│   ├── NoteTree.vue        # Дерево заметок в сайдбаре
│   └── ...
└── views/
    └── MainView.vue        # Главная страница с сайдбаром
```

### Offline-first синхронизация

Проект использует паттерн offline-first:
1. Изменения сохраняются в IndexedDB
2. Добавляются в syncQueue для отложенной синхронизации
3. При наличии сети - синхронизируются с сервером

Поле `isFavorite` должно обрабатываться через этот же механизм.

## Файлы для изменения

### 1. `src/types/index.ts`
- Добавить поле `isFavorite?: boolean` в интерфейс `Note`

### 2. `src/api/notes.ts`
- Добавить `UpdateNoteRequest.isFavorite?: boolean`
- API endpoint: PATCH `/api/notes/:id` (существующий) - расширить payload

### 3. `src/stores/notesStore.ts`
- Добавить геттер `favoriteNotes` - фильтрует заметки с `isFavorite: true`
- Добавить action `toggleFavorite(noteId: string)` - переключает статус

### 4. `src/services/offline/offlineStore.ts`
- Расширить `updateNote` для поддержки `isFavorite`

### 5. `src/composables/useCommandPalette.ts`
- Добавить секцию "Избранное" перед "Недавние заметки"
- Избранные отображаются с иконкой звезды

### 6. `src/components/NoteTree.vue`
- Добавить иконку звезды при hover на элементе
- Клик по звезде - toggleFavorite

### 7. `src/views/MainView.vue`
- Добавить секцию "Избранное" над секцией "Страницы"
- Секция сворачиваемая, скрыта если нет избранных

### 8. Новый компонент `src/components/FavoritesList.vue`
- Отображает список избранных страниц
- Кнопка удаления из избранного при hover
- Клик открывает страницу

## Детальный план реализации

### Этап 1: Расширение модели данных

```typescript
// src/types/index.ts
export interface Note {
  // ... существующие поля
  isFavorite?: boolean;  // новое поле
}
```

```typescript
// src/api/notes.ts
export interface UpdateNoteRequest {
  // ... существующие поля
  isFavorite?: boolean;
}
```

### Этап 2: Store и бизнес-логика

```typescript
// src/stores/notesStore.ts
getters: {
  favoriteNotes: (state) => 
    state.notes
      .filter(n => n.isFavorite)
      .sort((a, b) => a.title.localeCompare(b.title)),
}

actions: {
  async toggleFavorite(noteId: string) {
    const note = this.getNoteById(noteId);
    if (!note) return;
    
    await this.updateNote(noteId, { 
      isFavorite: !note.isFavorite 
    });
  }
}
```

### Этап 3: UI - Звёздочка в NoteTree

```vue
<!-- src/components/NoteTree.vue -->
<button
  v-if="hoveredNoteId === note.id"
  @click.stop="toggleFavorite(note.id)"
  class="favorite-button"
  :title="note.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'"
>
  <svg><!-- Star icon filled/outline --></svg>
</button>
```

### Этап 4: Секция "Избранное" в сайдбаре

```vue
<!-- src/views/MainView.vue -->
<!-- Добавить перед секцией "Страницы" -->
<FavoritesList
  v-if="favoriteNotes.length > 0"
  :notes="favoriteNotes"
  :selected-note-id="activeNoteId"
  @select-note="handleSelectNote"
  @remove-favorite="toggleFavorite"
/>
```

### Этап 5: Интеграция с Command Palette

```typescript
// src/composables/useCommandPalette.ts
const favoriteNotes = computed<CommandPaletteItem[]>(() => {
  return notesStore.favoriteNotes
    .slice(0, 10)
    .map(note => ({
      id: `favorite-${note.id}`,
      type: 'note' as const,
      title: note.title || 'Без названия',
      description: 'Избранное',
      icon: '⭐',
      action: () => {
        openTab(note.id);
        close();
      },
    }));
});

// В sections добавить перед "Недавние"
if (!query.value.trim() && favoriteNotes.value.length > 0) {
  result.push({
    id: 'favorites',
    title: 'Избранное',
    items: favoriteNotes.value,
  });
}
```

## UI/UX спецификация

### Иконка звезды

- **Пустая звезда** (outline) - страница не в избранном
- **Заполненная звезда** (filled, цвет: желтый/gold) - страница в избранном
- Появляется при hover на элементе в NoteTree
- Для избранных страниц - звезда видна всегда (не только при hover)

### Секция "Избранное" в сайдбаре

- Располагается над секцией "Страницы"
- Заголовок: "Избранное" с иконкой звезды
- Сворачиваемая секция (collapse/expand)
- Скрыта полностью если нет избранных страниц
- При hover на элементе - кнопка удаления из избранного

### Command Palette (Ctrl+K)

- Секция "Избранное" показывается первой (перед "Недавние заметки")
- Максимум 10 элементов в секции
- Каждый элемент с иконкой звезды
- Поиск по названию работает в избранных так же как в остальных

## Edge Cases и риски

### Edge Cases

1. **Удаление избранной страницы** - удаляется из избранного автоматически
2. **Пустой список избранных** - секция полностью скрыта
3. **Большое количество избранных** - в Command Palette лимит 10, в сайдбаре без лимита с прокруткой
4. **Конфликт синхронизации** - isFavorite мержится как last-write-wins (стандартное поведение)
5. **Offline режим** - изменения сохраняются локально, синхронизируются при появлении сети

### Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Backend не поддерживает поле isFavorite | Средняя | Проверить API, при необходимости хранить локально в IndexedDB metadata |
| Производительность при большом количестве заметок | Низкая | Фильтрация на уровне getter, computed с кэшированием |
| UX confusion: избранное vs недавние | Низкая | Чёткое визуальное разделение, разные иконки |

## Acceptance Criteria (тестирование)

### Функциональные тесты

- [ ] Клик по звёздочке добавляет страницу в избранное
- [ ] Повторный клик убирает из избранного
- [ ] Избранные отображаются в секции "Избранное" сайдбара
- [ ] Избранные отображаются в Command Palette (Ctrl+K)
- [ ] Ctrl+K > ввод названия избранной страницы > Enter открывает её
- [ ] Изменения синхронизируются между вкладками/устройствами
- [ ] Offline: избранное сохраняется локально
- [ ] Offline → Online: изменения синхронизируются

### UI тесты

- [ ] Звёздочка появляется при hover на элементе NoteTree
- [ ] Избранные элементы показывают заполненную звезду постоянно
- [ ] Секция "Избранное" скрыта при пустом списке
- [ ] Секция сворачивается/разворачивается
- [ ] Корректное отображение в тёмной теме

### Мобильная адаптация

- [ ] Секция "Избранное" корректно отображается в drawer
- [ ] Touch-friendly размер кнопки звёздочки

## Out of Scope (вне рамок задачи)

1. **Сортировка избранных** - отображаются по алфавиту, ручная сортировка не входит
2. **Группы избранного / папки** - только плоский список
3. **Лимит на количество избранных** - без ограничений
4. **Импорт/экспорт избранного** - не требуется
5. **Шаринг избранного между пользователями** - личные для каждого пользователя
6. **Горячая клавиша для добавления в избранное** - только через UI (звёздочка)
7. **Анимации при добавлении/удалении** - базовая функциональность без анимаций

## Зависимости

- Существующая система синхронизации (offlineStore, syncQueue)
- API backend должен принимать поле `isFavorite` в запросах на обновление заметки
- Если backend не поддерживает - fallback на localStorage/IndexedDB metadata

## Оценка трудозатрат

| Компонент | Сложность | Время |
|-----------|-----------|-------|
| Types + API | Низкая | 0.5ч |
| Store + бизнес-логика | Средняя | 1ч |
| NoteTree (звёздочка) | Низкая | 1ч |
| FavoritesList компонент | Средняя | 1.5ч |
| MainView интеграция | Низкая | 0.5ч |
| Command Palette | Низкая | 0.5ч |
| Тестирование + отладка | Средняя | 1.5ч |
| **Итого** | | **~6.5ч** |
