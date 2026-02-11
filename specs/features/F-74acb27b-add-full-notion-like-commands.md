# Feature Specification: Notion-like Block Commands

**Feature ID:** F-74acb27b
**Title:** Add full Notion-like commands
**Created:** 2026-02-11

---

## Summary

Полная переработка редактора заметок с textarea на блочный WYSIWYG редактор в стиле Notion с поддержкой slash-команд (`/`), drag & drop блоков и богатым форматированием.

---

## Requirements (из интервью)

### Типы блоков (команды)
Полный набор блоков:
- **Заголовки:** H1, H2, H3
- **Списки:** маркированный, нумерованный, чекбоксы (todo)
- **Цитаты:** blockquote
- **Код:** code block
- **Разделители:** horizontal rule
- **Callout/выноски:** 4 типа — Info (синий), Warning (жёлтый), Error (красный), Success/Tip (зелёный)

### Активация меню команд
- Меню появляется при вводе `/` **в начале строки** (как в Notion)
- Не активируется в середине текста

### Навигация и выбор команд
- Клик мышью по пункту меню
- Навигация стрелками вверх/вниз + Enter для выбора
- Фильтрация по набору текста (например `/hea` фильтрует до "heading")

### Архитектура редактора
- **Блочный WYSIWYG редактор** на базе **Tiptap** (ProseMirror)
- Удалить текущий split-view (textarea + превью)
- Оставить только единый блочный редактор

### Формат хранения данных
- **JSON-структура блоков** (внутренний формат Tiptap/ProseMirror)
- Markdown совместимость не требуется

### Миграция существующих заметок
- Автоматически парсить Markdown при открытии старых заметок
- Конвертировать в блочный формат "на лету"

### Визуальный стиль
- **Notion-стиль:** блоки без видимых границ
- При наведении слева появляется "ручка" (⋮⋮) для:
  - Перетаскивания (drag & drop)
  - Доступа к меню блока

### Drag & Drop
- Обязательная функция
- Перетаскивание блоков за ручку для изменения порядка

### Меню блока (при клике на ручку)
Полный Notion-стиль:
- Удалить блок
- Дублировать блок
- Изменить тип блока
- Переместить вверх/вниз
- Скопировать как текст
- Цвет текста
- Цвет фона
- Комментарий к блоку

### Inline-форматирование
Расширенный набор:
- Жирный (bold)
- Курсив (italic)
- Код (inline code)
- Ссылка (link)
- Подчёркивание (underline)
- Зачёркивание (strikethrough)
- Выделение цветом (highlight)

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/BlockEditor.vue` | Основной компонент блочного редактора на Tiptap |
| `src/components/BlockEditor/SlashCommandMenu.vue` | Меню slash-команд |
| `src/components/BlockEditor/BlockMenu.vue` | Контекстное меню блока (ручка ⋮⋮) |
| `src/components/BlockEditor/BubbleMenu.vue` | Всплывающее меню inline-форматирования |
| `src/components/BlockEditor/CalloutBlock.vue` | Кастомный блок callout |
| `src/extensions/SlashCommand.ts` | Tiptap extension для slash-команд |
| `src/extensions/CalloutExtension.ts` | Tiptap extension для callout блоков |
| `src/extensions/BlockComment.ts` | Tiptap extension для комментариев к блокам |
| `src/utils/markdownToBlocks.ts` | Конвертер Markdown → JSON блоки |
| `src/types/editor.ts` | TypeScript типы для редактора |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/NoteEditor.vue` | Заменить textarea + превью на BlockEditor |
| `src/types/index.ts` | Обновить тип Note: content → blocks (JSON) |
| `src/composables/useNotes.ts` | Обновить логику сохранения для JSON формата |
| `src/composables/useStorage.ts` | Добавить миграцию старых заметок |
| `package.json` | Добавить зависимости Tiptap |

---

## Implementation Approach

### Phase 1: Setup & Dependencies
1. Установить Tiptap и необходимые extensions:
   ```
   @tiptap/vue-3
   @tiptap/starter-kit
   @tiptap/extension-highlight
   @tiptap/extension-underline
   @tiptap/extension-link
   @tiptap/extension-task-list
   @tiptap/extension-task-item
   @tiptap/extension-placeholder
   @tiptap/extension-bubble-menu
   @tiptap/extension-floating-menu
   ```

### Phase 2: Core Editor
1. Создать `BlockEditor.vue` с базовой интеграцией Tiptap
2. Настроить стандартные extensions (StarterKit)
3. Добавить inline-форматирование (highlight, underline, link)
4. Реализовать BubbleMenu для inline-форматирования

### Phase 3: Slash Commands
1. Создать кастомный extension `SlashCommand.ts`
2. Реализовать `SlashCommandMenu.vue` с:
   - Списком всех доступных команд
   - Фильтрацией по вводу
   - Клавиатурной навигацией
3. Добавить иконки для каждой команды

### Phase 4: Callout Extension
1. Создать кастомный Node extension для callout
2. Поддержка 4 типов: info, warning, error, success
3. Стилизация с соответствующими цветами

### Phase 5: Block Menu & Drag-Drop
1. Реализовать ручку блока (⋮⋮) с меню
2. Интегрировать drag & drop через @tiptap/extension-bubble-menu или кастомную реализацию
3. Добавить действия: удалить, дублировать, изменить тип, цвета

### Phase 6: Migration
1. Создать `markdownToBlocks.ts` для парсинга Markdown
2. Обновить `useStorage.ts` для определения формата заметки
3. Автоматическая конвертация при открытии

### Phase 7: Integration
1. Заменить `NoteEditor.vue` на новый компонент
2. Обновить типы и composables
3. Удалить неиспользуемый код (textarea, превью)

---

## Acceptance Criteria

1. **Slash-команды:**
   - [ ] При вводе `/` в начале строки появляется меню команд
   - [ ] Меню содержит все заявленные блоки (заголовки, списки, цитаты, код, разделители, callout)
   - [ ] Работает фильтрация по тексту после `/`
   - [ ] Навигация стрелками и выбор Enter работает
   - [ ] Клик мышью выбирает команду

2. **Блочный редактор:**
   - [ ] Каждый блок редактируется inline (WYSIWYG)
   - [ ] При наведении на блок появляется ручка слева
   - [ ] Drag & drop блоков работает

3. **Меню блока:**
   - [ ] Удаление блока
   - [ ] Дублирование блока
   - [ ] Изменение типа блока
   - [ ] Перемещение вверх/вниз
   - [ ] Копирование как текст
   - [ ] Выбор цвета текста
   - [ ] Выбор цвета фона
   - [ ] Добавление комментария

4. **Inline-форматирование:**
   - [ ] При выделении текста появляется BubbleMenu
   - [ ] Работают: bold, italic, code, link, underline, strikethrough, highlight

5. **Callout блоки:**
   - [ ] 4 типа: Info (синий), Warning (жёлтый), Error (красный), Success (зелёный)
   - [ ] Визуально различимы по цвету

6. **Миграция:**
   - [ ] Старые Markdown заметки открываются корректно
   - [ ] Автоматическая конвертация при первом открытии

7. **Сохранение:**
   - [ ] Заметки сохраняются в JSON формате
   - [ ] Автосохранение работает (debounce)

---

## Edge Cases & Risks

### Технические риски
- **Парсинг Markdown:** Сложные конструкции (вложенные списки, таблицы, HTML) могут некорректно конвертироваться → использовать проверенную библиотеку (marked, remark)
- **Производительность:** Большие документы могут тормозить → использовать виртуализацию или lazy-loading блоков
- **Совместимость:** Потеря обратной совместимости с Markdown → явно указать в документации

### Edge cases
- Пустая заметка → показать placeholder с подсказкой "/команда"
- Копирование из внешних источников → санитизация HTML
- Вставка в середину блока → корректное разделение блоков
- Отмена/повтор (Ctrl+Z/Y) → использовать встроенную историю Tiptap
- Одновременное редактирование в нескольких вкладках → не поддерживается (один пользователь)

---

## Out of Scope

- Совместное редактирование (collaborative editing)
- Экспорт в Markdown/PDF
- Встраивание медиа (изображения, видео) — только текстовые блоки
- Таблицы
- Формулы LaTeX
- Вложенные блоки (кроме списков)
- Синхронизация между устройствами
- Тёмная тема (если не реализована в основном приложении)

---

## Dependencies

### NPM packages to add:
```json
{
  "@tiptap/vue-3": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-highlight": "^2.x",
  "@tiptap/extension-underline": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "@tiptap/extension-task-list": "^2.x",
  "@tiptap/extension-task-item": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-bubble-menu": "^2.x",
  "@tiptap/extension-floating-menu": "^2.x",
  "@tiptap/extension-text-style": "^2.x",
  "@tiptap/extension-color": "^2.x",
  "marked": "^9.x"
}
```

---

## Notes

- Tiptap выбран из-за отличной интеграции с Vue 3 и активного развития
- JSON формат хранения упрощает реализацию и обеспечивает точное сохранение структуры
- Миграция Markdown → JSON происходит "на лету" при открытии, без изменения исходных данных до первого сохранения
