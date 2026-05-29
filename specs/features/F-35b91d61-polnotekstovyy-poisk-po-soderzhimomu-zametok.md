# Спецификация: Полнотекстовый поиск по содержимому заметок

**ID задачи:** F-35b91d61  
**Дата создания:** 2026-05-29  
**Статус:** Готово к реализации

## Резюме

Расширить существующий поиск для отображения контекстных сниппетов с подсветкой найденных слов, добавить ранжирование результатов по релевантности и оптимизировать производительность для работы с 1000+ заметками.

## Текущее состояние

### Что уже реализовано:
- Поиск по заголовкам и содержимому заметок (`src/composables/useSearch.ts:15-17`)
- Отображение результатов в sidebar (`src/views/MainView.vue:40-68`)
- Регистронезависимый поиск
- Сортировка по дате обновления

### Что отсутствует:
- Показ сниппетов с контекстом найденного текста
- Подсветка совпадений в результатах
- Ранжирование по релевантности (вместо сортировки по дате)
- Debounce для оптимизации производительности
- Индикация, где найдено совпадение (в заголовке или в содержимом)

## Требования (из описания задачи)

| Требование | Приоритет |
|------------|-----------|
| Поиск находит совпадения в теле заметки | P0 (уже реализовано) |
| Результаты отображают контекст (snippet) с подсветкой совпадения | P0 |
| Поиск работает за <500ms на 1000+ заметках | P0 |
| Результаты ранжируются по релевантности | P0 |

## Детальный план реализации

### 1. Расширение `useSearch.ts` — логика поиска

**Файл:** `src/composables/useSearch.ts`

#### 1.1 Добавить функцию генерации сниппета

```typescript
interface SearchMatch {
  text: string;           // Текст сниппета (~100 символов)
  highlightStart: number; // Начало подсветки
  highlightEnd: number;   // Конец подсветки
  matchType: 'title' | 'content';
}

function extractSnippet(text: string, query: string, contextLength = 50): SearchMatch | null {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) return null;
  
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + query.length + contextLength);
  
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet += '...';
  
  const highlightStart = start > 0 ? matchIndex - start + 3 : matchIndex;
  
  return {
    text: snippet,
    highlightStart,
    highlightEnd: highlightStart + query.length,
    matchType: 'content',
  };
}
```

#### 1.2 Добавить ранжирование по релевантности

Алгоритм ранжирования:
1. **Точное совпадение в заголовке** — наивысший приоритет (score: 100)
2. **Частичное совпадение в заголовке** — высокий приоритет (score: 50)
3. **Совпадение в содержимом** — базовый приоритет (score: 10)
4. **Бонус за количество совпадений** — +5 за каждое дополнительное совпадение
5. **Бонус за позицию** — +10 если совпадение в начале текста

```typescript
function calculateRelevanceScore(note: Note, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = note.title.toLowerCase();
  const lowerContent = (note.content || '').toLowerCase();
  
  let score = 0;
  
  // Совпадение в заголовке
  if (lowerTitle === lowerQuery) {
    score += 100; // Точное совпадение
  } else if (lowerTitle.includes(lowerQuery)) {
    score += 50;
    if (lowerTitle.startsWith(lowerQuery)) score += 10; // В начале
  }
  
  // Совпадение в содержимом
  if (lowerContent.includes(lowerQuery)) {
    score += 10;
    // Бонус за количество совпадений (до 5)
    const matches = (lowerContent.match(new RegExp(escapeRegex(lowerQuery), 'gi')) || []).length;
    score += Math.min(matches, 5) * 5;
  }
  
  return score;
}
```

#### 1.3 Добавить debounce (300ms)

```typescript
import { ref, watch, type Ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';

export function useSearch(searchQuery: Ref<string>) {
  const searchResults = ref<SearchResult[]>([]);
  const isSearching = ref(false);
  
  const performSearch = useDebounceFn(() => {
    // ... логика поиска
    isSearching.value = false;
  }, 300);
  
  watch(searchQuery, () => {
    if (searchQuery.value.trim()) {
      isSearching.value = true;
      performSearch();
    } else {
      searchResults.value = [];
    }
  });
  
  return { searchResults, isSearching };
}
```

### 2. Обновление типов

**Файл:** `src/types/index.ts` (или новый `src/types/search.ts`)

```typescript
export interface SearchResult {
  note: Note;
  score: number;
  snippet: SearchMatch | null;
  matchedIn: 'title' | 'content' | 'both';
}

export interface SearchMatch {
  text: string;
  highlightStart: number;
  highlightEnd: number;
  matchType: 'title' | 'content';
}
```

### 3. Обновление UI компонента результатов

**Файл:** `src/views/MainView.vue`

Изменить секцию результатов поиска (строки 40-68):

```vue
<div v-if="searchQuery" class="space-y-1">
  <!-- Индикатор загрузки -->
  <div v-if="isSearching" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
    Поиск...
  </div>
  
  <div
    v-for="result in searchResults"
    :key="result.note.id"
    @click="handleSelectNote(result.note.id)"
    :class="[
      'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md',
      { 'bg-blue-50 dark:bg-blue-900': activeNoteId === result.note.id }
    ]"
  >
    <!-- Заголовок -->
    <div class="flex items-center gap-2">
      <span v-if="result.note.icon" class="text-sm">{{ result.note.icon }}</span>
      <div class="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
        {{ result.note.title || 'Без названия' }}
      </div>
    </div>
    
    <!-- Сниппет с подсветкой -->
    <div 
      v-if="result.snippet" 
      class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2"
    >
      <span v-html="highlightSnippet(result.snippet, searchQuery)"></span>
    </div>
    
    <!-- Индикатор типа совпадения -->
    <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
      <span v-if="result.matchedIn === 'title'">В заголовке</span>
      <span v-else-if="result.matchedIn === 'content'">В тексте</span>
      <span v-else>В заголовке и тексте</span>
    </div>
  </div>
  
  <div v-if="!isSearching && searchResults.length === 0" class="search-empty-container">
    <!-- Существующий EmptyState -->
  </div>
</div>
```

### 4. Функция подсветки совпадений

**Файл:** `src/utils/highlight.ts` (новый)

```typescript
export function highlightSnippet(snippet: SearchMatch, query: string): string {
  const text = snippet.text;
  const { highlightStart, highlightEnd } = snippet;
  
  const before = escapeHtml(text.slice(0, highlightStart));
  const match = escapeHtml(text.slice(highlightStart, highlightEnd));
  const after = escapeHtml(text.slice(highlightEnd));
  
  return `${before}<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">${match}</mark>${after}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `src/composables/useSearch.ts` | Полная переработка: сниппеты, релевантность, debounce |
| `src/views/MainView.vue` | Обновление UI результатов поиска (строки 40-68) |
| `src/types/index.ts` | Добавить типы SearchResult, SearchMatch |
| `src/utils/highlight.ts` | Новый файл: функция подсветки |

## Критерии приёмки

- [ ] Поиск находит совпадения в теле заметки (уже работает)
- [ ] Результаты показывают сниппет с контекстом (~100 символов)
- [ ] Найденное слово подсвечено в сниппете (жёлтый фон)
- [ ] Результаты отсортированы по релевантности (заголовок > содержимое)
- [ ] Поиск работает за <500ms на 1000+ заметках (debounce 300ms)
- [ ] Показывается индикатор «Поиск...» во время debounce
- [ ] Указано, где найдено совпадение (в заголовке/в тексте)
- [ ] Поддержка тёмной темы для подсветки
- [ ] Мобильная адаптация сохранена

## Edge Cases

| Случай | Поведение |
|--------|-----------|
| Несколько совпадений в одной заметке | Показать сниппет первого совпадения, указать количество |
| Совпадение на границе слова | Подсвечивать точно совпавший текст |
| Очень длинный текст (10000+ символов) | Поиск indexOf — O(n), достаточно быстро для клиента |
| Пустое содержимое заметки | Искать только в заголовке |
| Специальные символы в запросе | Экранировать для RegExp |
| HTML-теги в содержимом | Экранировать при отображении сниппета |

## Производительность

**Целевые метрики:**
- < 500ms на 1000 заметок
- Debounce 300ms для предотвращения лишних вычислений
- Клиентский поиск (без серверных запросов)

**Оптимизации:**
1. `useDebounceFn` из VueUse (уже в проекте)
2. `indexOf` вместо регулярных выражений для поиска
3. Ленивая генерация сниппетов (только для топ-50 результатов)

## Риски

| Риск | Митигация |
|------|-----------|
| Медленный поиск при большом количестве заметок | Debounce + лимит результатов (50) |
| XSS через контент заметки | Экранирование HTML в highlightSnippet |
| Неправильное ранжирование | Простой алгоритм, легко настроить веса |

## Вне scope

- Серверный полнотекстовый поиск (Elasticsearch, PostgreSQL FTS)
- Поиск с учётом морфологии (стемминг)
- Поиск по нескольким словам с AND/OR операторами
- Сохранение истории поиска
- Fuzzy-поиск (нечёткое совпадение)
- Поиск по метаданным (теги, дата создания)

## Примечания

Интервью с пользователем не было проведено из-за недоступности MCP бэкенда. Спецификация составлена на основе:
1. Описания задачи с критериями приёмки
2. Анализа существующего кода поиска
3. Стандартных практик UX для поиска в приложениях для заметок

---

*Создано: 2026-05-29*
