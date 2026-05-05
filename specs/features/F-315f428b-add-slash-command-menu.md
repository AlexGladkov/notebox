# F-315f428b: Slash Command Menu

## Summary

Расширение существующего slash-command меню AI-действиями (summarize, expand) для работы с выделенным текстом или текущим блоком. Базовая инфраструктура slash-меню уже полностью реализована.

## Current State Analysis

### Already Implemented
- **SlashCommand extension** (`src/extensions/SlashCommand.ts`) - полностью работает:
  - Отслеживание ввода `/` в редакторе
  - Парсинг query после слэша
  - Keyboard shortcuts (Enter, ArrowUp, ArrowDown, Escape)
  - Callbacks для UI (onShow, onHide, onNavigateUp, onNavigateDown, onSelectCurrent)

- **SlashCommandMenu component** (`src/components/BlockEditor/SlashCommandMenu.vue`) - полностью работает:
  - Позиционирование меню под курсором
  - Фильтрация команд по query и keywords
  - Навигация клавишами
  - Поддержка тёмной темы

- **Block creation commands** (15 команд в `BlockEditor.vue`):
  - Заголовки: H1, H2, H3
  - Списки: маркированный, нумерованный, чек-лист
  - Форматирование: цитата, блок кода, разделитель
  - Callout: info, warning, error, success
  - Специальные: вложенная заметка, база данных

### Missing Features
- AI-действия (summarize, expand)
- Группировка команд по категориям в UI

## Requirements

### 1. AI Commands

#### `/summarize` - Суммаризация текста
- **Триггер**: Ввод `/summarize` или `/sum`
- **Поведение**: 
  - Если есть выделенный текст - суммаризирует выделение
  - Если нет выделения - суммаризирует весь документ
- **Результат**: Заменяет выделение/добавляет суммаризацию в позицию курсора
- **UI индикация**: Показать loading state во время обработки

#### `/expand` - Расширение текста
- **Триггер**: Ввод `/expand` или `/exp`
- **Поведение**:
  - Требует выделенный текст или текст в текущем абзаце
  - Расширяет/дополняет указанный текст
- **Результат**: Заменяет/дополняет текст расширенной версией
- **UI индикация**: Показать loading state во время обработки

### 2. Command Categories (UI Enhancement)

Группировка команд в меню для лучшей навигации:
- **Базовые блоки**: H1, H2, H3, параграф
- **Списки**: маркированный, нумерованный, чек-лист
- **Форматирование**: цитата, код, разделитель
- **Выноски**: info, warning, error, success
- **Вставки**: вложенная заметка, база данных
- **AI действия**: суммаризация, расширение

### 3. Keyboard-First Interaction
- Уже реализовано через SlashCommand extension
- Enter - выбрать команду
- Arrow Up/Down - навигация
- Escape - закрыть меню
- Typing - фильтрация команд

## Implementation Approach

### Files to Modify

1. **`src/types/editor.ts`**
   - Добавить `category?: string` в интерфейс `SlashCommand`
   - Добавить `loading?: boolean` для AI команд

2. **`src/components/BlockEditor.vue`**
   - Добавить AI команды в `slashCommands` computed
   - Добавить состояние `aiLoading` для индикации загрузки
   - Добавить функции `handleSummarize()` и `handleExpand()`

3. **`src/components/BlockEditor/SlashCommandMenu.vue`**
   - Добавить группировку команд по категориям
   - Добавить визуальные разделители между группами
   - Добавить loading state для AI команд

4. **`src/api/ai.ts`** (новый файл)
   - Создать API клиент для AI операций
   - `summarize(text: string): Promise<string>`
   - `expand(text: string): Promise<string>`

### New Files to Create

1. **`src/api/ai.ts`** - API клиент для AI операций
2. **`src/composables/useAI.ts`** - composable для AI функциональности

## Acceptance Criteria

1. При вводе `/sum` или `/summarize` появляется команда "Суммаризировать"
2. При вводе `/exp` или `/expand` появляется команда "Расширить текст"
3. AI команды работают с выделенным текстом
4. Показывается индикатор загрузки во время AI обработки
5. Команды сгруппированы по категориям с визуальными разделителями
6. Клавиатурная навигация работает корректно между группами
7. Тёмная тема поддерживается для новых элементов

## Edge Cases

1. **Пустой выделенный текст**: Показать сообщение "Выделите текст для этого действия"
2. **Слишком длинный текст**: Ограничить input для AI (например, 10000 символов)
3. **Ошибка API**: Показать toast/notification с ошибкой, не менять текст
4. **Отмена операции**: Пользователь может нажать Escape во время загрузки
5. **Offline режим**: AI команды недоступны offline, показать соответствующее сообщение

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI API не настроен | High | Создать mock/stub реализацию с placeholder текстом |
| Долгое время ответа | Medium | Добавить timeout и возможность отмены |
| Потеря данных при ошибке | High | Не модифицировать текст до получения успешного ответа |

## Out of Scope

1. Настройка AI провайдера (OpenAI, Claude и т.д.)
2. Кастомные промпты для AI
3. История AI операций
4. Кэширование AI результатов
5. Локальные AI модели

## Interview Notes

> Интервью не состоялось из-за недоступности бэкенда для коммуникации.
> Спецификация создана на основе:
> - Анализа существующей кодовой базы
> - Описания задачи в issue
> - Best practices для подобных функций

## Technical Dependencies

- Tiptap editor (уже подключен)
- Vue 3 Composition API (используется)
- Tailwind CSS (используется)
- Backend API для AI операций (требуется endpoint)

## Deployment Notes

- Приложение обслуживается по subpath `/<project-slug>/`
- За nginx reverse proxy через HTTP
- Cookies без флага Secure
- API URLs должны быть относительными
