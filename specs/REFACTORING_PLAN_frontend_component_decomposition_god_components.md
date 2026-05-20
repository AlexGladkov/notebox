# План рефакторинга: Декомпозиция God Components

**Дата:** 2026-05-20  
**Ветка:** refactoring/frontend-component-decomposition-god-components-2e6a26cb  
**Основа:** reports/REFACTORING_ANALYSIS_frontend_component_decomposition_god_components.md

---

## Резюме

Рефакторинг направлен на разбиение монолитных Vue компонентов с нарушением SRP. Основная цель — снизить размер `BlockEditor.vue` (1318 строк) и `DatabaseBlock.vue` (763 строки) до ≤400 строк каждый путём выделения логики в composables и отдельные модули.

**Что будет сделано:**
1. Выделение slash-команд в модульную систему
2. Вынос операций с блоками в отдельный composable
3. Вынос wiki-link логики в composable
4. Вынос стилей редактора в CSS-файл
5. Выделение логики фильтрации и импорта из DatabaseBlock

**Ожидаемый результат:**
- BlockEditor.vue: 1318 → ~350 строк
- DatabaseBlock.vue: 763 → ~300 строк
- 5 новых переиспользуемых composables
- 6 модулей slash-команд по категориям

---

## Шаги рефакторинга

### Группа 1: BlockEditor — Slash-команды (Критическая)

#### Шаг 1: Создать структуру команд по категориям

**Файл:** `src/components/BlockEditor/commands/index.ts`

Создать barrel-файл для экспорта всех команд:
```typescript
export * from './basicBlocks';
export * from './lists';
export * from './formatting';
export * from './callouts';
export * from './inserts';
export * from './ai';
```

#### Шаг 2: Создать модуль базовых блоков

**Файл:** `src/components/BlockEditor/commands/basicBlocks.ts`

Вынести команды h1, h2, h3 из `slashCommands` computed (строки 215-247 BlockEditor.vue):
```typescript
import type { SlashCommand } from '@/types/editor';

export const createBasicBlockCommands = (getSlashQuery: () => string): SlashCommand[] => [
  {
    id: 'h1',
    title: 'Заголовок 1',
    description: 'Большой заголовок раздела',
    icon: 'H1',
    category: 'Базовые блоки',
    keywords: ['heading', 'h1', 'заголовок'],
    command: (editor) => {
      const query = getSlashQuery();
      editor.chain().focus().deleteRange({ 
        from: editor.state.selection.from - query.length - 1, 
        to: editor.state.selection.to 
      }).setHeading({ level: 1 }).run();
    },
  },
  // h2, h3 аналогично
];
```

#### Шаг 3: Создать модуль списков

**Файл:** `src/components/BlockEditor/commands/lists.ts`

Вынести команды bullet-list, numbered-list, todo-list (строки 249-282).

#### Шаг 4: Создать модуль форматирования

**Файл:** `src/components/BlockEditor/commands/formatting.ts`

Вынести команды blockquote, code-block, divider (строки 284-320).

#### Шаг 5: Создать модуль выносок (callouts)

**Файл:** `src/components/BlockEditor/commands/callouts.ts`

Вынести команды callout-info, callout-warning, callout-error, callout-success (строки 322-380).

#### Шаг 6: Создать модуль вставок

**Файл:** `src/components/BlockEditor/commands/inserts.ts`

Вынести команды template, nested-page, database, reminder (строки 382-438).

#### Шаг 7: Создать модуль AI-команд

**Файл:** `src/components/BlockEditor/commands/ai.ts`

Вынести команды summarize, expand (строки 440-458).

---

### Группа 2: BlockEditor — Composables (Критическая)

#### Шаг 8: Создать useSlashCommands composable

**Файл:** `src/components/BlockEditor/composables/useSlashCommands.ts`

Объединить все модули команд в один composable:
```typescript
import { computed, type Ref } from 'vue';
import type { SlashCommand } from '@/types/editor';
import { createBasicBlockCommands } from '../commands/basicBlocks';
import { createListCommands } from '../commands/lists';
// ... остальные импорты

export function useSlashCommands(
  slashQuery: Ref<string>,
  options: {
    createDatabase: () => Promise<void>;
    openNestedNoteModal: () => void;
    openTemplateGallery: () => void;
    openReminderModal: () => void;
    handleSummarize: (editor: Editor) => Promise<void>;
    handleExpand: (editor: Editor) => Promise<void>;
  }
) {
  const commands = computed<SlashCommand[]>(() => [
    ...createBasicBlockCommands(() => slashQuery.value),
    ...createListCommands(() => slashQuery.value),
    ...createFormattingCommands(() => slashQuery.value),
    ...createCalloutCommands(() => slashQuery.value),
    ...createInsertCommands(() => slashQuery.value, options),
    ...createAICommands(() => slashQuery.value, options),
  ]);

  return { commands };
}
```

#### Шаг 9: Создать useBlockOperations composable

**Файл:** `src/components/BlockEditor/composables/useBlockOperations.ts`

Вынести логику работы с блоками (строки 778-986 BlockEditor.vue):
```typescript
import { ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { BlockMenuAction } from '@/types/editor';

export function useBlockOperations(editor: Ref<Editor | undefined>) {
  const blockMenuVisible = ref(false);
  const blockMenuPosition = ref({ top: 0, left: 0 });
  const blockMenuActions = ref<BlockMenuAction[]>([]);
  const blockHandleVisible = ref(false);
  const blockHandlePosition = ref<{ top: number; left: number } | null>(null);
  const currentBlockPos = ref<number | null>(null);

  const handleMouseMove = (event: MouseEvent) => { /* ... */ };
  const openBlockMenu = (event: MouseEvent) => { /* ... */ };
  const deleteBlock = () => { /* ... */ };
  const duplicateBlock = () => { /* ... */ };
  const moveBlockUp = () => { /* ... */ };
  const moveBlockDown = () => { /* ... */ };
  const copyBlockAsText = () => { /* ... */ };
  const changeTextColor = () => { /* ... */ };
  const changeBackgroundColor = () => { /* ... */ };
  const addBlockComment = () => { /* ... */ };
  const startDrag = (event: MouseEvent) => { /* ... */ };

  return {
    blockMenuVisible,
    blockMenuPosition,
    blockMenuActions,
    blockHandleVisible,
    blockHandlePosition,
    handleMouseMove,
    openBlockMenu,
    startDrag,
  };
}
```

#### Шаг 10: Создать useWikiLinks composable

**Файл:** `src/components/BlockEditor/composables/useWikiLinks.ts`

Вынести логику wiki-ссылок (строки 585-650 BlockEditor.vue):
```typescript
import { ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { Note } from '@/types';
import { notesApi } from '@/api/notes';

export function useWikiLinks(
  editor: Ref<Editor | undefined>,
  emit: {
    noteCreated: (noteId: string) => void;
    navigateToNote: (noteId: string) => void;
  }
) {
  const wikiLinkMenuVisible = ref(false);
  const wikiLinkQuery = ref('');
  const wikiLinkRange = ref<{ from: number; to: number } | null>(null);

  const handleWikiLinkSelect = (note: Note) => { /* ... */ };
  const handleWikiLinkCreate = async (title: string) => { /* ... */ };

  return {
    wikiLinkMenuVisible,
    wikiLinkQuery,
    wikiLinkRange,
    handleWikiLinkSelect,
    handleWikiLinkCreate,
  };
}
```

#### Шаг 11: Вынести стили редактора в отдельный файл

**Файл:** `src/components/BlockEditor/styles/editor.css`

Перенести CSS из `<style scoped>` (строки 1036-1318, ~282 строки) в отдельный файл. Заменить scoped-стили на импорт:
```vue
<style scoped>
@import './styles/editor.css';
</style>
```

#### Шаг 12: Рефакторинг BlockEditor.vue

**Файл:** `src/components/BlockEditor.vue`

Заменить inline-код на использование composables:
1. Удалить строки 213-460 (slashCommands computed) — заменить на `useSlashCommands`
2. Удалить строки 585-650 (wiki-link handlers) — заменить на `useWikiLinks`
3. Удалить строки 736-986 (block operations) — заменить на `useBlockOperations`
4. Удалить строки 1036-1318 (CSS) — заменить на импорт

Итоговая структура компонента:
```vue
<script setup lang="ts">
import { useSlashCommands } from './BlockEditor/composables/useSlashCommands';
import { useBlockOperations } from './BlockEditor/composables/useBlockOperations';
import { useWikiLinks } from './BlockEditor/composables/useWikiLinks';
// ... остальные импорты

const { commands } = useSlashCommands(slashQuery, { /* options */ });
const { blockMenuVisible, /* ... */ } = useBlockOperations(editor);
const { wikiLinkMenuVisible, /* ... */ } = useWikiLinks(editor, { /* emit callbacks */ });
</script>
```

---

### Группа 3: DatabaseBlock (Высокая)

#### Шаг 13: Создать useDatabaseFiltering composable

**Файл:** `src/components/BlockEditor/Database/composables/useDatabaseFiltering.ts`

Вынести логику фильтрации и сортировки из DatabaseBlock.vue (строки 166-265):
```typescript
import { computed, type Ref } from 'vue';
import type { DatabaseRecord, DatabaseColumn, FilterConfig, SortConfig } from '@/types';

export function useDatabaseFiltering(
  records: Ref<DatabaseRecord[]>,
  columns: Ref<DatabaseColumn[]>,
  filters: Ref<FilterConfig[]>,
  sorts: Ref<SortConfig[]>,
  searchQuery: Ref<string>
) {
  const applyFilter = (record: DatabaseRecord, filter: FilterConfig): boolean => { /* ... */ };
  const applySearch = (record: DatabaseRecord, query: string): boolean => { /* ... */ };
  const applySort = (a: DatabaseRecord, b: DatabaseRecord): number => { /* ... */ };

  const filteredRecords = computed(() => {
    return records.value
      .filter(record => filters.value.every(f => applyFilter(record, f)))
      .filter(record => applySearch(record, searchQuery.value))
      .sort(applySort);
  });

  return { filteredRecords };
}
```

#### Шаг 14: Создать useDatabaseImport composable

**Файл:** `src/components/BlockEditor/Database/composables/useDatabaseImport.ts`

Вынести логику импорта CSV (строки 501-644):
```typescript
import type { DatabaseColumn, ColumnType } from '@/types';

interface ImportOptions {
  createColumn: (name: string, type: ColumnType) => Promise<DatabaseColumn>;
  createRecord: (values: Record<string, any>) => Promise<void>;
}

export function useDatabaseImport(options: ImportOptions) {
  const parseCSV = (content: string): string[][] => { /* ... */ };
  const detectColumnType = (values: string[]): ColumnType => { /* ... */ };
  const transformValue = (value: string, type: ColumnType): any => { /* ... */ };

  const importFromCSV = async (csvContent: string) => {
    const rows = parseCSV(csvContent);
    const headers = rows[0];
    // ... логика импорта
  };

  return { importFromCSV };
}
```

#### Шаг 15: Создать useDatabaseExport composable

**Файл:** `src/components/BlockEditor/Database/composables/useDatabaseExport.ts`

Вынести логику экспорта CSV (строки 482-499):
```typescript
import type { DatabaseRecord, DatabaseColumn } from '@/types';

export function useDatabaseExport() {
  const exportToCSV = (records: DatabaseRecord[], columns: DatabaseColumn[]): string => {
    const headers = columns.map(c => c.name).join(',');
    const rows = records.map(record => 
      columns.map(col => JSON.stringify(record.values[col.id] ?? '')).join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return { exportToCSV, downloadCSV };
}
```

#### Шаг 16: Создать barrel-файл для Database composables

**Файл:** `src/components/BlockEditor/Database/composables/index.ts`

```typescript
export * from './useDatabaseFiltering';
export * from './useDatabaseImport';
export * from './useDatabaseExport';
```

#### Шаг 17: Рефакторинг DatabaseBlock.vue

**Файл:** `src/components/BlockEditor/DatabaseBlock.vue`

Заменить inline-код на использование composables:
1. Удалить строки 166-265 (фильтрация/сортировка) — заменить на `useDatabaseFiltering`
2. Удалить строки 482-644 (импорт/экспорт CSV) — заменить на `useDatabaseImport` и `useDatabaseExport`

---

## Создаваемые файлы

| Файл | Назначение | Строк (прим.) |
|------|------------|---------------|
| `src/components/BlockEditor/commands/index.ts` | Barrel-файл команд | 10 |
| `src/components/BlockEditor/commands/basicBlocks.ts` | H1, H2, H3 | 45 |
| `src/components/BlockEditor/commands/lists.ts` | Списки | 45 |
| `src/components/BlockEditor/commands/formatting.ts` | Цитаты, код | 50 |
| `src/components/BlockEditor/commands/callouts.ts` | Выноски | 65 |
| `src/components/BlockEditor/commands/inserts.ts` | Шаблоны, вложенные, БД | 70 |
| `src/components/BlockEditor/commands/ai.ts` | AI команды | 35 |
| `src/components/BlockEditor/composables/useSlashCommands.ts` | Агрегатор команд | 50 |
| `src/components/BlockEditor/composables/useBlockOperations.ts` | Операции с блоками | 180 |
| `src/components/BlockEditor/composables/useWikiLinks.ts` | Wiki-ссылки | 80 |
| `src/components/BlockEditor/styles/editor.css` | Стили редактора | 280 |
| `src/components/BlockEditor/Database/composables/index.ts` | Barrel-файл | 5 |
| `src/components/BlockEditor/Database/composables/useDatabaseFiltering.ts` | Фильтрация | 90 |
| `src/components/BlockEditor/Database/composables/useDatabaseImport.ts` | Импорт CSV | 120 |
| `src/components/BlockEditor/Database/composables/useDatabaseExport.ts` | Экспорт CSV | 30 |

**Итого:** 15 новых файлов, ~1155 строк вынесенного кода

---

## Изменяемые файлы

| Файл | Текущий размер | Ожидаемый | Изменения |
|------|----------------|-----------|-----------|
| `src/components/BlockEditor.vue` | 1318 строк | ~350 строк | Удаление inline-логики, добавление импортов composables |
| `src/components/BlockEditor/DatabaseBlock.vue` | 763 строки | ~300 строк | Удаление логики фильтрации и импорта/экспорта |

---

## Файлы для удаления

Нет файлов для удаления.

---

## Миграции данных

Не требуются — рефакторинг затрагивает только frontend-код без изменения API или структуры данных.

---

## Стратегия тестирования

### 1. Ручное тестирование редактора

Проверить после каждого шага:
- [ ] Slash-команды открываются по `/`
- [ ] Все команды выполняются корректно (h1-h3, списки, цитаты, выноски, AI)
- [ ] Block handle отображается при наведении
- [ ] Block menu открывается по клику на handle
- [ ] Все действия в block menu работают (удаление, дублирование, перемещение)
- [ ] Wiki-ссылки создаются через `[[`
- [ ] Переход по wiki-ссылкам работает
- [ ] Создание новой заметки через wiki-link работает

### 2. Ручное тестирование DatabaseBlock

- [ ] Фильтрация по всем типам колонок работает
- [ ] Поиск по записям работает
- [ ] Сортировка работает
- [ ] Импорт CSV создаёт записи и колонки
- [ ] Экспорт CSV скачивает корректный файл

### 3. TypeScript проверка

```bash
npm run type-check
```

### 4. Сборка проекта

```bash
npm run build
```

---

## Оценка рисков

### Высокий риск

| Риск | Митигация |
|------|-----------|
| Потеря функциональности редактора | Тестировать каждую команду после выделения |
| Нарушение реактивности | Использовать `toRef`/`toRefs` для передачи в composables |

### Средний риск

| Риск | Митигация |
|------|-----------|
| Circular dependencies | Структурировать импорты: commands → composables → component |
| Неправильная типизация | Переиспользовать существующие типы из `@/types/editor` |

### Низкий риск

| Риск | Митигация |
|------|-----------|
| CSS specificity issues | Сохранить scoped через `@import` |

---

## Порядок выполнения

1. **Шаги 1-7** (команды) — можно выполнить параллельно, затем проверить
2. **Шаги 8-11** (composables BlockEditor) — последовательно с тестированием
3. **Шаг 12** (рефакторинг BlockEditor.vue) — финальная интеграция
4. **Шаги 13-16** (composables DatabaseBlock) — параллельно
5. **Шаг 17** (рефакторинг DatabaseBlock.vue) — финальная интеграция

---

## Критерии завершения

- [ ] `BlockEditor.vue` ≤ 400 строк
- [ ] `DatabaseBlock.vue` ≤ 400 строк
- [ ] Все slash-команды работают
- [ ] Все block operations работают
- [ ] Wiki-links работают
- [ ] Фильтрация/сортировка в DatabaseBlock работает
- [ ] Импорт/экспорт CSV работает
- [ ] `npm run type-check` проходит без ошибок
- [ ] `npm run build` успешно завершается
