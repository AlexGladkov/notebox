# Спецификация: Вложенные страницы внутри заметок

## Идентификатор
F-af26a353-add-pages

## Краткое описание
Добавить возможность создавать вложенные страницы внутри заметок. Страница — это заметка внутри другой заметки, с поддержкой до 3 уровней вложенности.

---

## Требования (по результатам интервью)

### Иерархия и структура
- **Уровни вложенности**: максимум 3 уровня (заметка → страница → подстраница → подподстраница)
- **Модель данных**: страницы хранятся как обычные заметки (Note) с добавлением поля `parentId`
- **Свойства**: каждая страница имеет свои независимые свойства (иконка, обложка, контент)

### UI/UX
- **Отображение в сайдбаре**: иерархический список с отступами слева под родителем, со сворачиванием
- **Создание страниц**: кнопка "+" появляется рядом с заметкой/страницей при наведении
- **Breadcrumbs**: показывать путь при просмотре вложенной страницы (Папка > Заметка > Страница > Подстраница)
- **Поиск**: страницы ищутся наравне с заметками, с указанием полного пути

### Перемещение и удаление
- **Перемещение**: через контекстное меню "Переместить в..." (без drag & drop)
- **Удаление родителя**: диалог подтверждения с выбором действия:
  - Удалить все вложенные страницы
  - Переместить вложенные страницы в папку родителя

---

## Файлы для модификации

### Backend (Kotlin/Spring)

| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/domain/note/Note.kt` | Добавить поле `parentId: String?` |
| `server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt` | Добавить колонку `parent_id` |
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Методы для работы с иерархией: `findByParentId`, `findChildren`, `getAncestors` |
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | Логика создания/удаления с учетом вложенности, валидация глубины (max 3) |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | Новые эндпоинты: создание подстраницы, перемещение, каскадное удаление |
| `server/src/main/kotlin/com/notebox/dto/NoteDto.kt` | Добавить `parentId`, `children`, `path` |

### Frontend (Vue.js/TypeScript)

| Файл | Изменения |
|------|-----------|
| `src/types/index.ts` | Добавить `parentId?: string` к интерфейсу Note |
| `src/api/notes.ts` | Новые методы API: `createSubpage`, `moveNote`, `deleteWithChildren` |
| `src/composables/useNotes.ts` | Логика работы с иерархией, состояние сворачивания |
| Новый: `src/components/NoteTree.vue` | Рекурсивный компонент для отображения иерархии в сайдбаре |
| Новый: `src/components/Breadcrumbs.vue` | Компонент хлебных крошек |
| Новый: `src/components/DeleteNoteDialog.vue` | Диалог подтверждения удаления с выбором действия |
| Новый: `src/components/MoveNoteDialog.vue` | Диалог выбора целевой заметки для перемещения |
| Модификация компонента сайдбара | Интеграция NoteTree, кнопка "+" при наведении |
| Компонент поиска | Отображение пути в результатах поиска |

---

## Детальный план реализации

### Этап 1: Backend — модель данных

1. **Миграция БД**: добавить колонку `parent_id` в таблицу `notes`
   ```sql
   ALTER TABLE notes ADD COLUMN parent_id VARCHAR(36) REFERENCES notes(id) ON DELETE SET NULL;
   CREATE INDEX idx_notes_parent_id ON notes(parent_id);
   ```

2. **Обновить NotesTable.kt**:
   ```kotlin
   val parentId = varchar("parent_id", 36).references(NotesTable.id).nullable()
   ```

3. **Обновить Note.kt**:
   ```kotlin
   data class Note(
       val id: String,
       val title: String,
       val content: String,
       val folderId: String,
       val parentId: String? = null, // NEW
       val icon: String? = null,
       val backdropType: String? = null,
       val backdropValue: String? = null,
       val backdropPositionY: Int? = null,
       val createdAt: Long,
       val updatedAt: Long,
       val isBlockFormat: Boolean = false
   )
   ```

### Этап 2: Backend — бизнес-логика

1. **NoteRepository.kt** — новые методы:
   - `findByParentId(parentId: String): List<Note>`
   - `findAllDescendants(noteId: String): List<Note>` — рекурсивный поиск всех потомков
   - `getDepth(noteId: String): Int` — вычисление глубины вложенности
   - `getAncestorPath(noteId: String): List<Note>` — путь от корня до заметки

2. **NoteService.kt** — логика:
   - Валидация при создании: проверка глубины (max 3)
   - Каскадное удаление или перемещение потомков
   - Перемещение с валидацией (нельзя переместить в своего потомка)

3. **NoteController.kt** — эндпоинты:
   - `POST /api/notes/{parentId}/subpages` — создание подстраницы
   - `PUT /api/notes/{noteId}/move` — перемещение (body: `{ targetParentId: string | null }`)
   - `DELETE /api/notes/{noteId}?action=cascade|orphan` — удаление с параметром

### Этап 3: Frontend — типы и API

1. **src/types/index.ts**:
   ```typescript
   export interface Note {
     id: string;
     title: string;
     content: string;
     folderId: string;
     parentId?: string | null; // NEW
     icon?: string | null;
     backdropType?: string | null;
     backdropValue?: string | null;
     backdropPositionY?: number;
     createdAt: number;
     updatedAt: number;
     isBlockFormat?: boolean;
   }

   export interface NoteWithChildren extends Note {
     children: NoteWithChildren[];
     path: Note[]; // ancestors from root to this note
   }
   ```

2. **src/api/notes.ts** — новые методы:
   ```typescript
   export async function createSubpage(parentId: string, title: string): Promise<Note>
   export async function moveNote(noteId: string, targetParentId: string | null): Promise<Note>
   export async function deleteNote(noteId: string, action: 'cascade' | 'orphan'): Promise<void>
   export async function getNotePath(noteId: string): Promise<Note[]>
   ```

### Этап 4: Frontend — компоненты

1. **NoteTree.vue** — рекурсивный компонент:
   - Принимает список заметок и parentId для фильтрации
   - Отступ 16px на каждый уровень вложенности
   - Иконка сворачивания/разворачивания (шеврон)
   - Кнопка "+" при наведении для создания подстраницы
   - Хранение состояния сворачивания в localStorage

2. **Breadcrumbs.vue**:
   - Путь кликабельный (можно перейти к любому элементу пути)
   - Разделитель: `>`
   - Текущий элемент не кликабельный, выделен

3. **DeleteNoteDialog.vue**:
   - Показывается только если есть вложенные страницы
   - Варианты: "Удалить всё" / "Переместить страницы наверх" / "Отмена"
   - Показывает количество вложенных страниц

4. **MoveNoteDialog.vue**:
   - Древовидный выбор целевой заметки/папки
   - Валидация: нельзя переместить в себя или своего потомка
   - Показывает предупреждение если будет превышен лимит вложенности

### Этап 5: Интеграция поиска

1. Обновить логику поиска для включения вложенных страниц
2. В результатах показывать путь: "Папка / Заметка / Страница"
3. При клике открывать страницу с раскрытием всей иерархии в сайдбаре

---

## Критерии приёмки

### Функциональные
- [ ] Можно создать страницу внутри заметки кнопкой "+"
- [ ] Можно создать до 3 уровней вложенности
- [ ] При попытке создать 4-й уровень показывается ошибка
- [ ] Страницы отображаются в сайдбаре с отступами
- [ ] Можно сворачивать/разворачивать списки вложенных страниц
- [ ] Breadcrumbs отображаются при просмотре вложенной страницы
- [ ] Поиск находит вложенные страницы и показывает путь
- [ ] При удалении заметки с подстраницами показывается диалог выбора
- [ ] Работает перемещение страниц через контекстное меню
- [ ] Каждая страница имеет независимые иконку и обложку

### Нефункциональные
- [ ] Состояние сворачивания сохраняется между сессиями
- [ ] Интерфейс не тормозит при большом количестве вложенных страниц (100+)
- [ ] API возвращает ошибки с понятными сообщениями

---

## Граничные случаи и риски

### Граничные случаи
1. **Циклические ссылки**: при перемещении нужна валидация, чтобы заметка не стала потомком самой себя
2. **Удаление промежуточного уровня**: при выборе "переместить наверх" подстраницы переносятся к родителю удаляемой
3. **Перемещение с превышением глубины**: если целевая заметка на 3-м уровне, нельзя переместить туда страницу с подстраницами

### Риски
1. **Производительность**: рекурсивные запросы при большой вложенности — использовать CTE или materialized path
2. **Консистентность**: при каскадном удалении использовать транзакции
3. **UX**: много вложенных страниц могут сделать сайдбар неудобным — рассмотреть виртуализацию списка

---

## Вне области видимости (Out of Scope)

- Drag & drop для перемещения страниц
- Наследование свойств (иконки, обложки) от родителя
- Шаблоны страниц
- Ссылки между страницами (backlinks)
- История версий страниц
- Совместное редактирование

---

## Миграция данных

Существующие заметки не требуют миграции — поле `parentId` будет `null` для всех текущих заметок, что означает заметку верхнего уровня.

---

## Зависимости

- Нет внешних зависимостей
- Использует существующую инфраструктуру (Vue 3, Kotlin/Spring, PostgreSQL)
