# Спецификация: Kanban Board View

**ID:** F-ed57baf8  
**Дата:** 2026-05-11  
**Статус:** Готово к реализации

## Резюме

Реализация Kanban-представления для существующих баз данных NoteBox. Kanban board будет новым типом view (наряду с существующим Table view), позволяющим визуализировать записи базы данных в виде колонок, сгруппированных по значениям SELECT-колонки.

## Контекст и анализ существующей архитектуры

### Текущее состояние

1. **Database Views**: Система views уже реализована в `src/types/database.ts`:
   - Views хранятся в localStorage с fallback на backend API
   - Каждый view имеет: `id`, `name`, `filter`, `sort`, `visibleColumns`
   - Views управляются через `DatabaseViewTabs.vue`

2. **DatabaseBlock**: Компонент `DatabaseBlock.vue` отображает базу данных:
   - Использует `DatabaseViewTabs` для переключения views
   - Рендерит только `DatabaseTable` — нет поддержки других типов представления

3. **Типы колонок**: Поддерживаются `SELECT` и `MULTI_SELECT` типы с опциями (`SelectOption[]`)

4. **Records**: Записи хранят данные в формате `{ [columnId: string]: any }`

### Решение

Kanban board реализуется как **новый тип view для существующих баз данных**. Пользователь создаёт базу данных и может переключаться между Table view и Kanban view. Группировка осуществляется по SELECT-колонке.

## Требования

### Функциональные требования

#### FR-1: Создание Kanban view
- При создании view пользователь выбирает тип: Table или Kanban
- Для Kanban view требуется выбрать колонку группировки (только SELECT или MULTI_SELECT)
- Если подходящих колонок нет, показывать предупреждение и предлагать создать SELECT-колонку

#### FR-2: Отображение Kanban доски
- Колонки доски соответствуют опциям SELECT-колонки
- Дополнительная колонка "Без статуса" для записей без значения
- Карточки отображают заголовок (первая TEXT-колонка) и краткую информацию
- Цвет заголовка колонки соответствует цвету опции

#### FR-3: Drag-and-Drop карточек
- Перетаскивание карточек между колонками меняет значение SELECT-поля
- Перетаскивание внутри колонки меняет порядок (опционально, если добавить поле position)
- Визуальная обратная связь при перетаскивании (подсветка целевой колонки)

#### FR-4: Drag-and-Drop колонок
- Возможность менять порядок колонок на доске
- Порядок сохраняется в настройках view

#### FR-5: Swimlanes (горизонтальная группировка)
- Опциональная вторичная группировка по другой SELECT-колонке
- Swimlanes отображаются как горизонтальные секции
- Свернуть/развернуть swimlane

#### FR-6: Операции с карточками
- Клик по карточке открывает модальное окно редактирования
- Быстрое добавление карточки в колонку через кнопку "+"
- Удаление карточки через контекстное меню

#### FR-7: Фильтрация и поиск
- Существующие фильтры работают в Kanban view
- Поиск фильтрует карточки по всем колонкам

### Нефункциональные требования

#### NFR-1: Производительность
- Виртуализация для колонок с >50 карточками
- Плавный drag-and-drop (60 fps)

#### NFR-2: Адаптивность
- Горизонтальный скролл для колонок на мобильных устройствах
- Компактный вид карточек на маленьких экранах

#### NFR-3: Доступность
- Поддержка клавиатурной навигации
- ARIA-атрибуты для screen readers

## Изменения типов данных

### Расширение DatabaseView

```typescript
// src/types/database.ts

export type ViewType = 'table' | 'kanban';

export interface KanbanConfig {
  groupByColumnId: string;        // ID SELECT-колонки для группировки
  swimlaneColumnId?: string;      // Опциональный ID колонки для swimlanes
  columnOrder?: string[];         // Порядок колонок (option IDs)
  collapsedColumns?: string[];    // Свёрнутые колонки
  collapsedSwimlanes?: string[];  // Свёрнутые swimlanes
  cardFields?: string[];          // ID колонок для отображения на карточке
}

export interface DatabaseView {
  id: string;
  name: string;
  type?: ViewType;                // По умолчанию 'table' для обратной совместимости
  filter?: DatabaseFilter;
  sort?: DatabaseSort;
  visibleColumns?: string[];
  kanban?: KanbanConfig;          // Настройки для kanban view
}
```

## Файлы для создания

### 1. src/components/BlockEditor/KanbanBoard.vue
Основной компонент Kanban-доски.

**Props:**
- `database: CustomDatabase`
- `records: Record[]`
- `view: DatabaseView`

**Emits:**
- `update-record`: Обновление записи (при drag-drop)
- `create-record`: Создание новой записи
- `delete-record`: Удаление записи
- `update-view`: Обновление настроек view

### 2. src/components/BlockEditor/KanbanColumn.vue
Компонент колонки Kanban.

**Props:**
- `option: SelectOption | null` (null для "Без статуса")
- `records: Record[]`
- `database: CustomDatabase`
- `collapsed: boolean`

**Emits:**
- `drop`: Карточка перетащена в эту колонку
- `toggle-collapse`: Свернуть/развернуть колонку
- `add-card`: Добавить карточку в колонку

### 3. src/components/BlockEditor/KanbanCard.vue
Компонент карточки.

**Props:**
- `record: Record`
- `database: CustomDatabase`
- `cardFields: string[]`

**Emits:**
- `click`: Открыть карточку для редактирования
- `delete`: Удалить карточку

### 4. src/components/BlockEditor/KanbanSwimlane.vue
Компонент swimlane (опционально).

### 5. src/components/BlockEditor/CreateViewModal.vue
Модальное окно создания view с выбором типа.

### 6. src/components/BlockEditor/KanbanCardModal.vue
Модальное окно редактирования карточки.

## Файлы для изменения

### 1. src/types/database.ts
- Добавить `ViewType`, `KanbanConfig`
- Расширить `DatabaseView`

### 2. src/components/BlockEditor/DatabaseBlock.vue
- Добавить условный рендеринг: Table или Kanban в зависимости от `currentView.type`
- Импортировать `KanbanBoard`

### 3. src/components/BlockEditor/DatabaseViewTabs.vue
- Добавить иконки типа view (таблица/канбан)
- При создании view открывать `CreateViewModal`

### 4. src/composables/useDatabases.ts
- Обновить типы для новых полей view

## Детальный план реализации

### Этап 1: Базовый Kanban (MVP)
1. Расширить типы в `database.ts`
2. Создать `KanbanBoard.vue` с базовым отображением колонок
3. Создать `KanbanCard.vue` для отображения карточек
4. Создать `KanbanColumn.vue` для колонок
5. Модифицировать `DatabaseBlock.vue` для условного рендеринга
6. Добавить создание Kanban view через prompt (временно)

### Этап 2: Drag-and-Drop
1. Реализовать drag-and-drop карточек между колонками
2. Добавить визуальную обратную связь
3. Обновлять записи при drop

### Этап 3: UI улучшения
1. Создать `CreateViewModal.vue` для выбора типа view
2. Создать `KanbanCardModal.vue` для редактирования
3. Добавить иконки типов в tabs
4. Добавить кнопку "+" для создания карточки в колонке

### Этап 4: Дополнительные функции
1. Drag-and-drop колонок для изменения порядка
2. Сворачивание колонок
3. Swimlanes (опционально)

## Критерии приёмки

### AC-1: Создание Kanban view
- [ ] Пользователь может создать новый view типа Kanban
- [ ] При создании выбирается SELECT-колонка для группировки
- [ ] Если SELECT-колонок нет, показывается предупреждение

### AC-2: Отображение доски
- [ ] Колонки соответствуют опциям SELECT-колонки
- [ ] Карточки отображаются в правильных колонках
- [ ] Записи без значения показываются в "Без статуса"
- [ ] Цвета колонок соответствуют цветам опций

### AC-3: Drag-and-Drop
- [ ] Карточки можно перетаскивать между колонками
- [ ] При drop значение SELECT-поля обновляется
- [ ] Есть визуальная обратная связь при перетаскивании

### AC-4: CRUD операции
- [ ] Можно создать карточку через "+" в колонке
- [ ] Клик по карточке открывает редактирование
- [ ] Можно удалить карточку

### AC-5: Совместимость
- [ ] Фильтры работают в Kanban view
- [ ] Поиск работает в Kanban view
- [ ] Переключение между Table и Kanban сохраняет данные

## Edge Cases и риски

### Edge Cases
1. **Пустая база данных**: Показать empty state с предложением добавить карточку
2. **Нет SELECT-колонок**: Предложить создать или показать ошибку
3. **Много опций (>10)**: Горизонтальный скролл
4. **Много карточек в колонке (>100)**: Виртуализация или lazy loading
5. **MULTI_SELECT группировка**: Карточка может появиться в нескольких колонках
6. **Удаление опции SELECT**: Карточки переходят в "Без статуса"

### Риски
1. **Производительность drag-and-drop**: Использовать native HTML5 drag-drop или проверенную библиотеку
2. **Синхронизация данных**: При drag-drop немедленно обновлять локальное состояние, затем сервер
3. **Mobile UX**: Touch события требуют особой обработки для drag-and-drop

## Out of Scope (вне текущей реализации)

1. Кастомные поля на карточках (кроме заголовка)
2. Множественная сортировка внутри колонки
3. WIP-лимиты (ограничение количества карточек в колонке)
4. Автоматизации (при перемещении в колонку X сделать Y)
5. Комментарии к карточкам
6. Подзадачи внутри карточки
7. Приоритеты и метки (кроме существующих тегов)

## Ограничения окружения развёртывания

- Приложение работает за nginx reverse proxy через HTTP (не HTTPS)
- SPA роутер должен поддерживать subpath (`/<project-slug>/`)
- Cookies без флага Secure (настраивается через `COOKIE_SECURE=false`)
- API URLs должны быть относительными путями

## Технический стек

- **Frontend**: Vue 3, Vite, TailwindCSS, TypeScript
- **Block Editor**: TipTap
- **Backend**: Kotlin, Spring Boot
- **Хранение views**: localStorage (с fallback на backend API)
