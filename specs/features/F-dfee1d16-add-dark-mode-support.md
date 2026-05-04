# F-dfee1d16: Поддержка тёмной темы

## Краткое описание

Завершить реализацию тёмной темы для всех компонентов приложения NoteBox. Инфраструктура темизации уже готова (useTheme.ts, CSS-переменные, Tailwind dark mode), но несколько компонентов редактора блоков не поддерживают тёмную тему.

## Статус интервью

Интервью с пользователем не было завершено из-за недоступности бэкенда. Спецификация составлена на основе анализа кодовой базы.

## Текущее состояние

### Готовая инфраструктура

1. **useTheme.ts** (`src/composables/useTheme.ts`)
   - Поддержка режимов: light, dark, system
   - Сохранение в localStorage
   - Отслеживание системных настроек через `prefers-color-scheme`
   - Применение класса `.dark` к `<html>`

2. **Tailwind CSS** (`tailwind.config.js`)
   - `darkMode: 'class'` — активация через класс

3. **CSS-переменные** (`src/style.css`)
   - `--bg-primary`, `--bg-secondary`, `--bg-hover`, `--bg-active`
   - `--text-primary`, `--text-secondary`
   - `--border-color`, `--primary-color`, `--danger-color`
   - Определены для `:root` (светлая) и `.dark` (тёмная) тем

4. **UI настроек** (`src/components/settings/AppearanceSection.vue`)
   - Переключатель темы (светлая/тёмная/системная)
   - Сохранение на сервере через authStore

### Компоненты с поддержкой тёмной темы

| Компонент | Способ реализации |
|-----------|-------------------|
| MainView.vue | Tailwind `dark:` классы |
| Sidebar.vue | Tailwind `dark:` классы |
| NoteEditor.vue | Tailwind `dark:` классы |
| BlockEditor.vue | Scoped + unscoped `.dark` стили |
| ConfirmDialog.vue | Tailwind `dark:` классы |
| SettingsModal.vue | Unscoped `.dark` стили |
| AppearanceSection.vue | Unscoped `.dark` стили |
| TabBar.vue | Tailwind `dark:` классы |
| TabItem.vue | Tailwind `dark:` классы |
| SearchBar.vue | Tailwind `dark:` классы |
| EmojiPicker.vue | CSS-переменные (автоматически) |

### Компоненты БЕЗ поддержки тёмной темы

| Компонент | Проблема |
|-----------|----------|
| SlashCommandMenu.vue | Жёсткие светлые цвета (#fff, #e5e7eb, #f3f4f6) |
| BubbleMenu.vue | Жёсткие светлые цвета (white, #e5e7eb, #374151) |
| BlockMenu.vue | Жёсткие светлые цвета (white, #e5e7eb, #f3f4f6) |

## Требования

### Функциональные

1. **Все popup-меню редактора должны поддерживать тёмную тему:**
   - SlashCommandMenu (меню команд `/`)
   - BubbleMenu (всплывающее меню форматирования)
   - BlockMenu (контекстное меню блока)

2. **Консистентность стилей:**
   - Использовать единый подход для всех компонентов
   - Предпочтительно: CSS-переменные или Tailwind `dark:` классы

3. **Плавные переходы:**
   - Переходы при смене темы уже настроены глобально в style.css

### Нефункциональные

1. **Производительность:** Не добавлять тяжёлые вычисления при смене темы
2. **Доступность:** Соблюдать контрастность WCAG AA (4.5:1 для текста)
3. **Поддержка браузеров:** Chrome, Firefox, Safari, Edge (последние 2 версии)

## Файлы для модификации

### Обязательные изменения

1. `src/components/BlockEditor/SlashCommandMenu.vue`
   - Добавить стили для `.dark` класса или использовать CSS-переменные

2. `src/components/BlockEditor/BubbleMenu.vue`
   - Добавить стили для `.dark` класса или использовать CSS-переменные

3. `src/components/BlockEditor/BlockMenu.vue`
   - Добавить стили для `.dark` класса или использовать CSS-переменные

### Рекомендуемый подход

Использовать unscoped стили с селектором `.dark` (как в AppearanceSection.vue), так как это:
- Работает с Teleport-компонентами
- Совместимо с текущей архитектурой
- Не требует изменения scoped-стилей

## Детальный план реализации

### 1. SlashCommandMenu.vue

Текущие стили:
```css
.slash-command-menu {
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.command-item:hover,
.command-item.active {
  background-color: #f3f4f6;
}

.command-title {
  color: #111827;
}

.command-description {
  color: #6b7280;
}
```

Добавить unscoped стили:
```css
/* Dark theme */
.dark .slash-command-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.dark .command-item:hover,
.dark .command-item.active {
  background-color: #374151;
}

.dark .command-title {
  color: #f9fafb;
}

.dark .command-description {
  color: #9ca3af;
}
```

### 2. BubbleMenu.vue

Текущие стили:
```css
.bubble-menu {
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.menu-button {
  color: #374151;
}

.menu-button:hover {
  background-color: #f3f4f6;
}

.menu-button.is-active {
  background-color: #dbeafe;
  color: #1e40af;
}

.menu-divider {
  background-color: #e5e7eb;
}
```

Добавить unscoped стили:
```css
/* Dark theme */
.dark .bubble-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .menu-button {
  color: #d1d5db;
}

.dark .menu-button:hover {
  background-color: #374151;
}

.dark .menu-button.is-active {
  background-color: #1e3a5f;
  color: #60a5fa;
}

.dark .menu-divider {
  background-color: #4b5563;
}
```

### 3. BlockMenu.vue

Текущие стили:
```css
.block-menu {
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-label {
  color: #374151;
}
```

Добавить unscoped стили:
```css
/* Dark theme */
.dark .block-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.dark .menu-item:hover {
  background-color: #374151;
}

.dark .menu-label {
  color: #d1d5db;
}
```

## Критерии приёмки

1. [ ] SlashCommandMenu корректно отображается в тёмной теме
2. [ ] BubbleMenu корректно отображается в тёмной теме
3. [ ] BlockMenu корректно отображается в тёмной теме
4. [ ] Переключение темы работает мгновенно без перезагрузки
5. [ ] Все popup-меню имеют достаточный контраст текста в обеих темах
6. [ ] Нет визуальных артефактов при переключении темы
7. [ ] Стили консистентны с остальными компонентами приложения

## Тестирование

### Ручное тестирование

1. Открыть приложение в светлой теме
2. Проверить работу SlashCommandMenu (ввести `/` в редакторе)
3. Проверить работу BubbleMenu (выделить текст)
4. Проверить работу BlockMenu (клик на ручку блока)
5. Переключить на тёмную тему
6. Повторить шаги 2-4
7. Переключить на системную тему и проверить с разными системными настройками

### Браузеры для тестирования
- Chrome (последняя версия)
- Firefox (последняя версия)

## Edge Cases и риски

### Edge Cases

1. **Системная тема меняется во время работы** — должно отрабатываться автоматически через `matchMedia` listener (уже реализовано)
2. **localStorage недоступен** — fallback на системную тему (уже реализовано)
3. **Popup открыт во время смены темы** — CSS transitions обеспечат плавный переход

### Риски

1. **Низкий:** Scoped стили могут конфликтовать с unscoped — решается порядком подключения
2. **Низкий:** Teleport-компоненты могут не наследовать стили — unscoped стили решают проблему

## Вне scope

- Поддержка кастомных тем (не только light/dark)
- Синхронизация темы между устройствами (уже реализовано через API)
- Редизайн цветовой палитры
- Тёмная тема для TipTap callout-блоков (уже реализовано в BlockEditor.vue)

## Зависимости

- Нет внешних зависимостей
- Все необходимые инструменты уже в проекте (Tailwind, CSS variables)

## Оценка трудозатрат

- Реализация: ~1-2 часа
- Тестирование: ~30 минут
- **Итого: ~2 часа**
