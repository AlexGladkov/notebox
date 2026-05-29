# Mobile-адаптация интерфейса приложения

## Краткое описание

Реализация полноценной responsive версии приложения NoteBox для мобильных устройств с поддержкой touch-взаимодействий, выдвижной боковой панели (drawer), адаптивного редактора и оптимизированных табличных представлений баз данных.

## Статус интервью

**Интервью не завершено** — бэкенд для сбора требований был недоступен (ошибка подключения). Спецификация составлена на основе:
- Acceptance criteria из описания задачи
- Анализа текущей кодовой базы
- Лучших практик мобильной адаптации

## Требования

### 1. Выдвижная боковая панель (Drawer)

**Текущее состояние:**
- `UnifiedSidebar.vue` имеет фиксированную ширину `w-72` (288px)
- Панель всегда видима на экране
- Нет механизма скрытия/показа

**Требования:**
- На экранах < 768px (mobile/tablet): боковая панель скрыта по умолчанию
- Открывается через иконку-бургер в верхнем левом углу
- Поддержка свайпа слева для открытия
- Поддержка свайпа влево или тапа на overlay для закрытия
- Анимация slide-in/slide-out (300ms, ease-out)
- Overlay с затемнением фона при открытом drawer
- На экранах >= 768px: стандартное поведение (фиксированная панель)

### 2. Адаптивный редактор с touch-friendly управлением

**Текущее состояние:**
- `NoteEditor.vue` и `BlockEditor.vue` не адаптированы для touch
- Мелкие кнопки и элементы управления

**Требования:**
- Увеличенные touch-target для всех интерактивных элементов (минимум 44x44px)
- Адаптивный заголовок заметки (размер шрифта на mobile)
- Оптимизированная панель инструментов для touch-устройств
- Правильная работа виртуальной клавиатуры (viewport resize)
- Sticky header с названием заметки на mobile

### 3. Оптимизированные табличные представления

**Текущее состояние:**
- `DatabaseTable.vue` использует HTML table с фиксированной структурой
- Горизонтальный overflow на маленьких экранах

**Требования:**
- На mobile: переключение на card-based view вместо таблицы
- Каждая запись отображается как отдельная карточка
- Возможность горизонтального скролла таблицы (опционально)
- Адаптивные ячейки с увеличенными touch-target
- Kanban-доска (`KanbanBoard.vue`): горизонтальный скролл колонок на mobile

### 4. Slash-команды на touch-устройствах

**Текущее состояние:**
- `SlashCommandMenu.vue` позиционируется абсолютно относительно курсора
- Нет адаптации для touch

**Требования:**
- На mobile: меню slash-команд фиксируется снизу экрана (bottom sheet)
- Увеличенные элементы списка для touch
- Плавная анимация появления снизу
- Закрытие по свайпу вниз или тапу на overlay

### 5. Breakpoints

Тестирование и оптимизация для следующих breakpoints:
- **320px** — iPhone SE, маленькие телефоны
- **375px** — iPhone 6/7/8/X, стандартные телефоны
- **414px** — iPhone Plus, большие телефоны
- **768px** — iPad portrait, планшеты
- **1024px** — iPad landscape, большие планшеты

## Файлы для создания/модификации

### Новые файлы

| Файл | Описание |
|------|----------|
| `src/composables/useMobileDetect.ts` | Composable для определения mobile/touch устройств |
| `src/composables/useSwipe.ts` | Composable для обработки свайп-жестов |
| `src/composables/useDrawer.ts` | Composable для управления состоянием drawer |
| `src/components/MobileHeader.vue` | Мобильный header с бургер-меню |
| `src/components/DrawerOverlay.vue` | Overlay для drawer |
| `src/components/BlockEditor/MobileSlashMenu.vue` | Bottom sheet версия slash-меню |
| `src/components/BlockEditor/DatabaseCardView.vue` | Card-based view для таблиц на mobile |

### Модифицируемые файлы

| Файл | Изменения |
|------|-----------|
| `src/App.vue` | Интеграция drawer, mobile header, responsive layout |
| `src/components/UnifiedSidebar.vue` | Drawer-режим, анимации, touch-события |
| `src/components/NoteEditor.vue` | Touch-friendly элементы, адаптивные размеры |
| `src/components/BlockEditor.vue` | Интеграция mobile slash-меню |
| `src/components/BlockEditor/SlashCommandMenu.vue` | Условное переключение на mobile версию |
| `src/components/BlockEditor/DatabaseTable.vue` | Переключение table/card view |
| `src/components/BlockEditor/DatabaseCell.vue` | Увеличенные touch-target |
| `src/components/BlockEditor/KanbanBoard.vue` | Горизонтальный скролл колонок |
| `src/components/TabBar.vue` | Адаптация для mobile (скролл вкладок) |
| `tailwind.config.js` | Кастомные breakpoints (если требуется) |

## Детальный план реализации

### Этап 1: Инфраструктура (composables)

1. **useMobileDetect.ts**
   - Определение ширины экрана через `window.matchMedia`
   - Reactive состояние `isMobile` (< 768px), `isTablet` (768-1024px)
   - Определение touch-устройства через `'ontouchstart' in window`

2. **useSwipe.ts**
   - Обработка touch-событий (touchstart, touchmove, touchend)
   - Определение направления свайпа (left, right, up, down)
   - Настраиваемый threshold (минимальное расстояние для срабатывания)

3. **useDrawer.ts**
   - Состояние открытия/закрытия drawer
   - Блокировка скролла body при открытом drawer
   - Методы open(), close(), toggle()

### Этап 2: Drawer и мобильная навигация

1. Модификация `App.vue`:
   - Условный рендеринг sidebar/drawer в зависимости от `isMobile`
   - Добавление `MobileHeader` с бургер-иконкой
   - Интеграция `DrawerOverlay`

2. Модификация `UnifiedSidebar.vue`:
   - CSS-классы для drawer-режима (position: fixed, z-index, transform)
   - CSS transitions для анимации
   - Интеграция useSwipe для закрытия свайпом

### Этап 3: Адаптация редактора

1. Модификация `NoteEditor.vue`:
   - Увеличение touch-target кнопок (44px минимум)
   - Адаптивные размеры шрифтов
   - Sticky header на mobile

2. Модификация `BlockEditor/BubbleMenu.vue`:
   - Увеличенные кнопки для touch
   - Возможно, перенос вниз экрана на mobile

### Этап 4: Mobile Slash-меню

1. Создание `MobileSlashMenu.vue`:
   - Bottom sheet с командами
   - Анимация slide-up
   - Закрытие по свайпу вниз

2. Модификация `SlashCommandMenu.vue`:
   - Условное переключение на mobile версию
   - Передача состояния в mobile-версию

### Этап 5: Адаптация таблиц

1. Создание `DatabaseCardView.vue`:
   - Card layout для записей
   - Показ всех полей вертикально
   - Действия на карточке (edit, delete)

2. Модификация `DatabaseTable.vue`:
   - Переключатель table/card view
   - Автоматическое переключение на mobile

3. Модификация `KanbanBoard.vue`:
   - Горизонтальный скролл с snap points
   - Touch-friendly перетаскивание карточек

### Этап 6: Финальная оптимизация

1. Тестирование на всех breakpoints
2. Оптимизация производительности анимаций
3. Accessibility проверка (aria-labels, focus management)

## CSS/Tailwind стратегия

```css
/* Примеры responsive классов */
.sidebar {
  @apply fixed inset-y-0 left-0 w-72 transform -translate-x-full transition-transform duration-300;
  @apply md:relative md:translate-x-0;
}

.sidebar.open {
  @apply translate-x-0;
}

.touch-target {
  @apply min-h-[44px] min-w-[44px];
}
```

## Acceptance Criteria

- [ ] Боковая панель работает как drawer на экранах < 768px
- [ ] Drawer открывается по кнопке-бургеру и свайпу слева
- [ ] Drawer закрывается по тапу на overlay и свайпу влево
- [ ] Все интерактивные элементы имеют touch-target >= 44px
- [ ] Slash-команды отображаются как bottom sheet на mobile
- [ ] Таблицы баз данных переключаются на card view на mobile
- [ ] Kanban-доска поддерживает горизонтальный скролл на mobile
- [ ] Приложение корректно работает на breakpoints: 320px, 375px, 414px, 768px, 1024px
- [ ] Анимации плавные (60fps) на мобильных устройствах
- [ ] Виртуальная клавиатура не перекрывает поле ввода

## Edge Cases и риски

### Edge Cases
- Landscape режим на телефонах (малая высота экрана)
- Устройства с notch/dynamic island
- Планшеты в split-view режиме
- Медленные устройства (анимации)
- PWA режим (safe area insets)

### Риски
- **Производительность**: Сложные анимации могут тормозить на старых устройствах
  - *Митигация*: использовать `will-change`, `transform` вместо `left/top`
- **Конфликт жестов**: Свайп для drawer может конфликтовать с навигацией браузера
  - *Митигация*: Добавить зону свайпа только у левого края экрана
- **Tiptap на touch**: Редактор может иметь проблемы с touch-выделением
  - *Митигация*: Тестирование и возможные workarounds

## Out of Scope

- Отдельное мобильное приложение (React Native, Flutter)
- Поддержка iOS Safari < 14
- Специфичная адаптация для складных устройств
- Gesture-based редактирование текста (рисование, рукописный ввод)
- Offline-first оптимизация (уже реализована отдельно)

## Deployment Notes

Приложение деплоится на subpath `/<project-slug>/` за nginx reverse proxy:
- Base path должен быть конфигурируемым через переменную окружения
- Все ассеты должны использовать относительные пути
- Service Worker должен корректно работать с subpath

## Зависимости

Новые npm-зависимости не требуются. Вся функциональность реализуется на:
- Vue 3 (composables, reactive)
- Tailwind CSS (responsive utilities)
- Vanilla JS (touch events)
