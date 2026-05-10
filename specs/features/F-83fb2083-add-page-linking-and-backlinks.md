# F-83fb2083: Wiki-style Page Linking and Backlinks

## Summary

Реализация wiki-стиля связывания страниц с синтаксисом `[[название]]`, автоподсказками при вводе, отображением двунаправленных обратных ссылок (backlinks) и визуальным графом связей для обнаружения знаний.

## Requirements

### Собранные требования

Интервью с пользователем не было проведено (MCP бэкенд недоступен). Требования основаны на описании задачи и анализе существующей кодовой базы:

1. **Wiki-синтаксис ссылок**: `[[Название страницы]]` для связывания по названию
2. **Автоподсказки**: Всплывающее меню с предложениями страниц при вводе `[[`
3. **Обратные ссылки (Backlinks)**: Секция на странице, показывающая все страницы, которые ссылаются на текущую
4. **Граф связей**: Визуальное отображение связей между страницами (частично реализовано)
5. **Обнаружение знаний**: Возможность навигации через граф связей

### Анализ существующей реализации

**Что уже есть:**
- `src/utils/parseNoteLinks.ts` — парсинг HTML-ссылок формата `/notes/{noteId}`
- `src/composables/useGraph.ts` — построение графа связей из заметок
- `src/views/GraphView.vue` — визуализация графа на canvas
- `src/composables/useSearch.ts` — поиск заметок по названию
- TipTap редактор с поддержкой slash-команд и Link extension

**Что нужно добавить:**
- Wiki-link extension для TipTap (распознавание `[[...]]`)
- Автокомплит popup при вводе `[[`
- Парсинг wiki-ссылок в `parseNoteLinks.ts`
- Секция backlinks в NoteEditor
- Интеграция wiki-ссылок с существующим графом

## Files to Create/Modify

### Новые файлы

1. **`src/extensions/WikiLinkExtension.ts`**
   - TipTap extension для wiki-ссылок
   - Распознавание синтаксиса `[[название]]`
   - Input rule для автоматического преобразования
   - Node type для рендеринга ссылок

2. **`src/components/BlockEditor/WikiLinkSuggestion.vue`**
   - Popup компонент для автоподсказок
   - Поиск по названиям заметок
   - Клавиатурная навигация (стрелки, Enter, Escape)
   - Создание новой страницы если не найдена

3. **`src/components/Backlinks.vue`**
   - Компонент секции обратных ссылок
   - Список страниц, ссылающихся на текущую
   - Превью контекста ссылки
   - Клик для навигации

4. **`src/composables/useBacklinks.ts`**
   - Composable для вычисления обратных ссылок
   - Кэширование результатов
   - Реактивное обновление при изменении заметок

### Модифицируемые файлы

1. **`src/utils/parseNoteLinks.ts`**
   - Добавить парсинг wiki-синтаксиса `[[...]]`
   - Поддержка обоих форматов: HTML links и wiki-links

2. **`src/components/BlockEditor.vue`**
   - Добавить WikiLinkExtension в extensions
   - Интеграция WikiLinkSuggestion popup
   - Передача списка заметок для автокомплита

3. **`src/components/NoteEditor.vue`**
   - Добавить секцию Backlinks под редактором
   - Props для списка обратных ссылок

4. **`src/views/MainView.vue`**
   - Вычисление backlinks для выбранной заметки
   - Передача данных в NoteEditor

5. **`src/composables/useGraph.ts`**
   - Обновить для поддержки wiki-ссылок
   - Извлечение связей из обоих форматов

## Implementation Approach

### Phase 1: Wiki-Link Extension для TipTap

```typescript
// src/extensions/WikiLinkExtension.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface WikiLinkOptions {
  notes: Array<{ id: string; title: string }>;
  onShowSuggestions: (query: string, position: { left: number; top: number }) => void;
  onHideSuggestions: () => void;
  onNavigate: (noteId: string) => void;
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      noteId: { default: null },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(
      { 'data-wiki-link': '', class: 'wiki-link' },
      HTMLAttributes
    ), HTMLAttributes.title];
  },

  addProseMirrorPlugins() {
    // Plugin to detect [[ input and show suggestions
  },
});
```

### Phase 2: Suggestion Popup

```vue
<!-- src/components/BlockEditor/WikiLinkSuggestion.vue -->
<template>
  <div
    v-if="visible"
    class="wiki-link-suggestions"
    :style="{ left: position.left + 'px', top: position.top + 'px' }"
  >
    <div
      v-for="(note, index) in filteredNotes"
      :key="note.id"
      :class="['suggestion-item', { active: index === selectedIndex }]"
      @click="selectNote(note)"
    >
      <span class="note-icon">{{ note.icon || '📄' }}</span>
      <span class="note-title">{{ note.title }}</span>
    </div>
    <div
      v-if="query && filteredNotes.length === 0"
      class="suggestion-item create-new"
      @click="createNewNote"
    >
      <span class="note-icon">➕</span>
      <span>Создать "{{ query }}"</span>
    </div>
  </div>
</template>
```

### Phase 3: Backlinks Composable

```typescript
// src/composables/useBacklinks.ts
import { computed, type Ref } from 'vue';
import type { Note } from '../types';
import { extractNoteLinks } from '../utils/parseNoteLinks';

export interface Backlink {
  note: Note;
  context: string; // текст вокруг ссылки
}

export function useBacklinks(
  currentNoteId: Ref<string | null>,
  allNotes: Ref<Note[]>
) {
  const backlinks = computed<Backlink[]>(() => {
    if (!currentNoteId.value) return [];
    
    return allNotes.value
      .filter(note => {
        const links = extractNoteLinks(note.content);
        return links.includes(currentNoteId.value!);
      })
      .map(note => ({
        note,
        context: extractLinkContext(note.content, currentNoteId.value!),
      }));
  });

  return { backlinks };
}
```

### Phase 4: Backlinks Component

```vue
<!-- src/components/Backlinks.vue -->
<template>
  <div v-if="backlinks.length > 0" class="backlinks-section">
    <h3 class="backlinks-title">
      {{ backlinks.length }} {{ getBacklinksWord(backlinks.length) }}
    </h3>
    <div class="backlinks-list">
      <div
        v-for="backlink in backlinks"
        :key="backlink.note.id"
        class="backlink-item"
        @click="$emit('navigate', backlink.note.id)"
      >
        <span class="backlink-icon">{{ backlink.note.icon || '📄' }}</span>
        <div class="backlink-content">
          <div class="backlink-title">{{ backlink.note.title }}</div>
          <div class="backlink-context">{{ backlink.context }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Phase 5: Update parseNoteLinks

```typescript
// src/utils/parseNoteLinks.ts (обновление)
export function extractNoteLinks(content: string | null | undefined): string[] {
  if (!content || typeof content !== 'string') return [];
  
  const linkSet = new Set<string>();
  
  // Существующий HTML-формат: href="/notes/{noteId}"
  const htmlPattern = /href="\/notes\/([a-f0-9-]+)"/g;
  let match;
  while ((match = htmlPattern.exec(content)) !== null) {
    linkSet.add(match[1]);
  }
  
  // Wiki-формат: data-wiki-link data-note-id="{noteId}"
  const wikiPattern = /data-note-id="([a-f0-9-]+)"/g;
  while ((match = wikiPattern.exec(content)) !== null) {
    linkSet.add(match[1]);
  }
  
  return Array.from(linkSet);
}
```

## Acceptance Criteria

### Wiki-ссылки
- [ ] Ввод `[[` открывает popup с предложениями страниц
- [ ] Фильтрация по вводимому тексту (fuzzy search)
- [ ] Навигация стрелками вверх/вниз
- [ ] Enter выбирает страницу и вставляет ссылку
- [ ] Escape закрывает popup
- [ ] Клик по ссылке открывает связанную страницу
- [ ] Если страница не найдена — предложение создать новую

### Backlinks
- [ ] Секция "Обратные ссылки" под редактором
- [ ] Показывает все страницы, ссылающиеся на текущую
- [ ] Отображает контекст (текст вокруг ссылки)
- [ ] Клик по backlink открывает страницу-источник
- [ ] Счётчик количества обратных ссылок

### Граф связей
- [ ] Wiki-ссылки отображаются на графе наравне с HTML-ссылками
- [ ] Тип связи различим визуально (link vs parent)

### Визуальный дизайн
- [ ] Wiki-ссылки стилизованы отлично от обычного текста
- [ ] Hover-эффект на ссылках
- [ ] Индикация несуществующей страницы (broken link)
- [ ] Поддержка тёмной темы

## Edge Cases and Risks

### Edge Cases

1. **Циклические ссылки**: A → B → C → A
   - Решение: Разрешить, граф это поддерживает

2. **Ссылка на несуществующую страницу**
   - Решение: Показывать красным цветом, предлагать создать при клике

3. **Переименование страницы**
   - Решение: Хранить noteId в атрибуте, title только для отображения
   - При переименовании ссылки автоматически обновятся

4. **Удаление связанной страницы**
   - Решение: Показывать как broken link, не ломать документ

5. **Несколько страниц с одинаковым названием**
   - Решение: Показывать в popup с индикацией (иконка, путь)

6. **Очень длинный список backlinks**
   - Решение: Виртуализация или пагинация при > 50 ссылок

7. **Ссылка внутри code block**
   - Решение: Не обрабатывать, оставлять как текст

### Risks

1. **Производительность при большом количестве заметок**
   - Митигация: Кэширование индекса ссылок, ленивый расчёт backlinks

2. **Конфликт с существующим HTML-форматом**
   - Митигация: Поддерживать оба формата параллельно

3. **Сложность интеграции с TipTap**
   - Митигация: Использовать документированные API, следовать паттернам SlashCommand

## Out of Scope

1. **Блочные ссылки (block references)** — ссылки на конкретный блок внутри страницы
2. **Embed страниц** — встраивание содержимого другой страницы
3. **Unlinked mentions** — показ страниц, упоминающих текст без ссылки
4. **Алиасы для страниц** — альтернативные названия для поиска
5. **Групповые операции** — массовое переименование ссылок
6. **История изменений ссылок** — отслеживание когда ссылка была добавлена/удалена
7. **Граф локального контекста** — показ только связей выбранной страницы на отдельном графе

## Technical Notes

### Хранение данных

Wiki-ссылки будут храниться в JSON-формате TipTap как custom node:

```json
{
  "type": "wikiLink",
  "attrs": {
    "noteId": "uuid-of-linked-note",
    "title": "Название страницы"
  }
}
```

HTML-рендеринг для совместимости:

```html
<span data-wiki-link data-note-id="uuid" class="wiki-link">Название страницы</span>
```

### Интеграция с существующим кодом

- **Slash Commands**: WikiLink suggestion использует аналогичный паттерн
- **useGraph**: Обновить `extractNoteLinks` для поддержки wiki-формата
- **Link extension**: Существующий, wiki-links — дополнительный тип

### Deployment Considerations

- Subpath routing: относительные пути для навигации
- Без HTTPS: не влияет на функциональность
- API: не требуются изменения бэкенда (ссылки в контенте заметки)
