# Анализ рефакторинга: Декомпозиция God Components

**Дата анализа:** 2026-05-20  
**Ветка:** refactoring/frontend-component-decomposition-god-components-2e6a26cb  
**Цель:** Разбить монолитные Vue компоненты на мелкие, выделить переиспользуемые части, соблюсти SRP

---

## 1. Обзор текущей архитектуры

### 1.1 Структура компонентов

Проект использует Vue 3 с Composition API. Компоненты организованы в следующую структуру:

```
src/
├── components/
│   ├── BlockEditor/           # Компоненты редактора (27 файлов)
│   │   ├── cells/            # Ячейки таблицы (15 файлов)
│   │   └── *.vue
│   ├── QuickCapture/         # Быстрый захват (5 файлов)
│   ├── TemplateGallery/      # Шаблоны (3 файла)
│   ├── settings/             # Настройки (6 файлов)
│   ├── reminder/             # Напоминания (4 файла)
│   ├── auth/                 # Авторизация (3 файла)
│   └── *.vue                 # Корневые компоненты
├── composables/              # Логика приложения (29 файлов)
│   ├── database/             # Composables для БД (6 файлов)
│   └── utils/                # Утилиты (3 файла)
└── views/                    # Страницы (3 файла)
```

### 1.2 Composables

Логика хорошо разделена на composables:
- `useNotes` (255 строк) - управление заметками
- `useTabs` (240 строк) - система вкладок
- `useDatabases` - CRUD для баз данных (разделён на 6 файлов в database/)

---

## 2. Выявленные God Components

### 2.1 Рейтинг компонентов по размеру

| # | Компонент | Строк | Критичность |
|---|-----------|-------|-------------|
| 1 | `BlockEditor.vue` | 1318 | 🔴 Критическая |
| 2 | `DatabaseBlock.vue` | 763 | 🟠 Высокая |
| 3 | `MainView.vue` | 626 | 🟠 Высокая |
| 4 | `DatabaseFilter.vue` | 610 | 🟡 Средняя |
| 5 | `CsvImportDialog.vue` | 550 | 🟡 Средняя |
| 6 | `KanbanBoard.vue` | 510 | 🟡 Средняя |
| 7 | `MultiSelectCell.vue` | 498 | 🟡 Средняя |
| 8 | `KanbanCardModal.vue` | 494 | 🟡 Средняя |

---

## 3. Детальный анализ God Components

### 3.1 BlockEditor.vue (1318 строк) — 🔴 Критический

**Местоположение:** `src/components/BlockEditor.vue`

**Выявленные ответственности (нарушение SRP):**

1. **Инициализация редактора** (строки 485-578)
   - Конфигурация TipTap
   - Настройка 11 расширений
   - Обработчики событий

2. **Slash-команды** (строки 213-460)
   - 20 команд в одном computed
   - 8 категорий (Базовые блоки, Списки, Форматирование, Выноски, Вставки, AI действия, Действия)
   - Каждая команда содержит inline-логику

3. **AI операции** (строки 141-211)
   - `handleSummarize` — суммаризация текста
   - `handleExpand` — расширение текста

4. **Wiki-links** (строки 585-650)
   - `handleWikiLinkSelect` — выбор существующей заметки
   - `handleWikiLinkCreate` — создание новой заметки

5. **Block меню** (строки 778-842)
   - 8 действий (удаление, дублирование, перемещение, копирование, цвета, комментарии)

6. **Block handle и drag** (строки 736-986)
   - `handleMouseMove` — отслеживание позиции
   - `deleteBlock`, `duplicateBlock`, `moveBlockUp`, `moveBlockDown`
   - `copyBlockAsText`, `changeTextColor`, `changeBackgroundColor`
   - `addBlockComment`

7. **Парсинг контента** (строки 463-483, 988-1028)
   - Обработка JSON и HTML
   - Синхронизация с modelValue

8. **Управление вложенными заметками** (строки 652-724)
   - Модальное окно создания
   - Обработка pending состояния

9. **Управление шаблонами** (строки 726-733)

10. **Стилизация** (строки 1036-1318)
    - 282 строки CSS
    - Стили для ProseMirror, wiki-links, block-handle

**Зависимости импортов:**
- 9 Tiptap расширений
- 5 кастомных расширений
- 6 дочерних компонентов
- 2 composables (`useDatabases`, `useAI`)
- 1 API (`notesApi`)

**Code Smells:**
- Feature Envy: логика AI и wiki-links не принадлежит редактору
- Long Method: `slashCommands` computed содержит 250 строк
- God Class: компонент знает слишком много о бизнес-логике

---

### 3.2 DatabaseBlock.vue (763 строки) — 🟠 Высокая

**Местоположение:** `src/components/BlockEditor/DatabaseBlock.vue`

**Выявленные ответственности:**

1. **Загрузка данных** (строки 267-293)
   - `loadData` — асинхронная загрузка БД и записей

2. **Управление views** (строки 295-369)
   - `handleSelectView`, `handleCreateView`, `handleRenameView`, `handleDeleteView`

3. **Фильтрация** (строки 166-225)
   - `applyFilter` — 9 операторов
   - `applySearch` — поиск по всем колонкам

4. **Сортировка** (строки 254-265)
   - `applySort` — универсальная сортировка

5. **CRUD операции** (строки 405-476)
   - 6 обработчиков для записей и колонок

6. **Импорт CSV** (строки 501-644)
   - Сложная логика преобразования данных
   - Создание новых колонок и опций

7. **Экспорт CSV** (строки 482-499)

8. **Toast уведомления** (строки 135-141)

**Зависимости:**
- 5 дочерних компонентов
- 1 composable (`useDatabases`)
- 2 утилиты

---

### 3.3 MainView.vue (626 строк) — 🟠 Высокая

**Местоположение:** `src/views/MainView.vue`

**Выявленные ответственности:**

1. **Управление боковой панелью** (строки 1-165)
   - Профиль пользователя
   - Поиск
   - Древовидный список страниц
   - Фильтр по тегам
   - Кнопки управления (граф, тема)

2. **Система вкладок** (строки 169-179)

3. **Редактор** (строки 181-196)

4. **Теги** (строки 529-585)
   - `handleAddTag`, `handleRemoveTag`, `handleCreateTag`
   - `toggleTagFilter`, `clearTagFilter`

5. **Работа с заметками** (строки 414-485)
   - `handleSelectNote`, `handleCreateRootPage`, `handleCreateSubpage`
   - `handleUpdateNote`, `handleCreateFromTemplate`

6. **Фильтрация по тегам** (строки 347-412)
   - Вычисление предков
   - Автоматическое раскрытие

**Проблема дублирования:**
`App.vue` (331 строка) содержит почти идентичную логику, что указывает на необходимость унификации.

---

### 3.4 DatabaseFilter.vue (610 строк) — 🟡 Средняя

**Местоположение:** `src/components/BlockEditor/DatabaseFilter.vue`

**Ответственности:**
- UI компонент фильтра
- Логика операторов для разных типов колонок
- Кастомный select dropdown с цветами
- 276 строк CSS

---

## 4. Граф зависимостей

```
App.vue
└── MainView.vue
    ├── UnifiedSidebar.vue
    ├── SearchBar.vue
    ├── NoteTree.vue
    ├── NoteEditor.vue
    │   ├── BlockEditor.vue ← 🔴 GOD COMPONENT
    │   │   ├── BubbleMenu.vue
    │   │   ├── SlashCommandMenu.vue
    │   │   ├── BlockMenu.vue
    │   │   ├── CreateNestedNoteModal.vue
    │   │   ├── WikiLinkSuggestion.vue
    │   │   └── TemplateGalleryModal.vue
    │   ├── NoteCover.vue
    │   ├── NoteIcon.vue
    │   ├── NoteTags.vue
    │   ├── Backlinks.vue
    │   └── ReminderModal.vue
    ├── TabBar.vue
    └── TagFilter.vue

DatabaseBlock.vue ← 🟠 GOD COMPONENT
├── DatabaseViewTabs.vue
├── DatabaseToolbar.vue
├── DatabaseTable.vue
│   ├── DatabaseCell.vue
│   │   └── cells/*.vue (15 компонентов)
│   ├── DatabaseColumnHeader.vue
│   └── DatabaseAddRow.vue
├── KanbanBoard.vue ← 🟡 LARGE COMPONENT
│   ├── KanbanColumn.vue
│   ├── KanbanCard.vue
│   └── KanbanCardModal.vue
└── CsvImportDialog.vue ← 🟡 LARGE COMPONENT
```

---

## 5. Оценка рисков

### 5.1 Высокий риск

| Компонент | Риск | Причина |
|-----------|------|---------|
| `BlockEditor.vue` | Регрессия редактора | Центральный компонент, много состояния |
| `DatabaseBlock.vue` | Потеря данных | CRUD операции, импорт/экспорт |

### 5.2 Средний риск

| Компонент | Риск | Причина |
|-----------|------|---------|
| `MainView.vue` | UX регрессия | Навигация, теги, поиск |
| `KanbanBoard.vue` | Drag & drop | Сложное состояние перемещения |

### 5.3 Низкий риск

| Компонент | Риск | Причина |
|-----------|------|---------|
| `DatabaseFilter.vue` | Фильтрация | Изолированная логика |
| `CsvImportDialog.vue` | Импорт | Модальное окно |

---

## 6. Рекомендуемый подход к рефакторингу

### 6.1 BlockEditor.vue → Разделение на 7+ частей

```
src/components/BlockEditor/
├── BlockEditor.vue            # 200-300 строк (оркестратор)
├── composables/
│   ├── useEditorSetup.ts      # Инициализация TipTap
│   ├── useSlashCommands.ts    # Slash-команды
│   ├── useBlockOperations.ts  # Block menu actions
│   ├── useWikiLinks.ts        # Wiki-link логика
│   └── useAIEditor.ts         # AI операции
├── commands/
│   ├── basicBlocks.ts         # H1, H2, H3
│   ├── lists.ts               # Списки
│   ├── formatting.ts          # Цитаты, код, разделители
│   ├── callouts.ts            # Выноски
│   ├── inserts.ts             # Шаблоны, вложенные, БД
│   └── ai.ts                  # AI команды
└── styles/
    └── editor.css             # Все стили редактора
```

### 6.2 DatabaseBlock.vue → Разделение на 4+ части

```
src/components/BlockEditor/Database/
├── DatabaseBlock.vue          # 200 строк (оркестратор)
├── composables/
│   ├── useDatabaseData.ts     # Загрузка и кэширование
│   ├── useDatabaseFiltering.ts # Фильтрация и сортировка
│   ├── useDatabaseImport.ts   # CSV импорт
│   └── useDatabaseExport.ts   # CSV экспорт
└── DatabaseToast.vue          # Toast уведомления
```

### 6.3 MainView.vue → Унификация с App.vue

```
src/views/MainView.vue         # 300 строк
src/components/
├── PageSidebar.vue            # Боковая панель
├── TagFilterPanel.vue         # Фильтр по тегам
└── NoteListView.vue           # Список заметок
```

---

## 7. Порядок рефакторинга (приоритеты)

### Фаза 1: Критическая (BlockEditor)
1. Выделить `useSlashCommands.ts` — наименее рискованно
2. Выделить `useBlockOperations.ts`
3. Выделить `useWikiLinks.ts`
4. Вынести CSS в отдельный файл
5. Выделить `useEditorSetup.ts`

### Фаза 2: Высокая (DatabaseBlock, MainView)
6. Выделить `useDatabaseFiltering.ts`
7. Выделить `useDatabaseImport.ts`
8. Унифицировать MainView и App.vue
9. Создать `PageSidebar.vue`

### Фаза 3: Средняя (остальные)
10. Рефакторинг `DatabaseFilter.vue`
11. Рефакторинг `KanbanBoard.vue`
12. Рефакторинг `CsvImportDialog.vue`

---

## 8. Метрики успеха

| Метрика | До | После (цель) |
|---------|-----|--------------|
| Макс. строк в компоненте | 1318 | ≤400 |
| Компонентов >500 строк | 8 | 0 |
| Ответственностей в BlockEditor | 10+ | 2-3 |
| Переиспользуемых composables | 29 | 40+ |
| Дублирование кода (App/Main) | ~50% | 0% |

---

## 9. Файлы, затронутые рефакторингом

### Будут изменены:
- `src/components/BlockEditor.vue`
- `src/components/BlockEditor/DatabaseBlock.vue`
- `src/views/MainView.vue`
- `src/App.vue`
- `src/components/BlockEditor/DatabaseFilter.vue`
- `src/components/BlockEditor/KanbanBoard.vue`
- `src/components/BlockEditor/CsvImportDialog.vue`

### Будут созданы:
- `src/components/BlockEditor/composables/useSlashCommands.ts`
- `src/components/BlockEditor/composables/useBlockOperations.ts`
- `src/components/BlockEditor/composables/useWikiLinks.ts`
- `src/components/BlockEditor/composables/useEditorSetup.ts`
- `src/components/BlockEditor/composables/useAIEditor.ts`
- `src/components/BlockEditor/commands/*.ts` (6 файлов)
- `src/components/BlockEditor/styles/editor.css`
- `src/components/PageSidebar.vue`
- `src/components/TagFilterPanel.vue`

---

## 10. Заключение

Проект имеет чётко выраженную проблему "God Components" в критических частях приложения. Основная точка боли — `BlockEditor.vue` с 1318 строками и 10+ ответственностями.

**Ключевые выводы:**
1. Composables уже хорошо организованы (пример: `database/`) — нужно продолжить этот паттерн
2. Slash-команды легко выделяются в отдельные модули по категориям
3. MainView и App.vue требуют унификации для устранения дублирования
4. CSS составляет ~20% кода в крупных компонентах — вынос стилей даст быстрый эффект

**Рекомендация:** Начать с Фазы 1 (BlockEditor), так как это наиболее критический компонент с наименьшим риском при поэтапном выделении composables.
