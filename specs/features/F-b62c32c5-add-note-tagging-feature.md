# Спецификация: Функция тегирования заметок

## Идентификатор
F-b62c32c5-add-note-tagging-feature

## Статус
INTERVIEW_INCOMPLETE — MCP бэкенд недоступен, спецификация создана на основе анализа кодовой базы и лучших практик.

## Резюме

Добавление функции тегирования заметок, позволяющей пользователям организовывать и фильтровать заметки с помощью цветных тегов. Функциональность аналогична существующему компоненту MultiSelectCell в базах данных.

## Собранные требования

### Анализ кодовой базы (вместо интервью)

1. **Существующие паттерны UI**: Компонент `MultiSelectCell.vue` уже реализует:
   - Выбор нескольких опций с цветными бейджами
   - Поиск по существующим опциям
   - Создание новых опций "на лету"
   - Цветовая палитра из 8 цветов (`TAG_COLOR_PALETTE`)

2. **Текущая модель Note**: Содержит поля id, title, content, parentId, icon, backdropType, backdropValue, backdropPositionY, color, createdAt, updatedAt. Тегов нет.

3. **API архитектура**: REST API на Kotlin/Spring с Exposed ORM.

4. **Frontend**: Vue 3 + TypeScript, composables для бизнес-логики.

### Предлагаемая реализация (по умолчанию)

Поскольку интервью невозможно, предлагается комбинированный подход:
- Теги создаются "на лету" при вводе (как в MultiSelectCell)
- Глобальный список тегов для всех заметок пользователя
- Фильтрация заметок по тегам в списке

## Файлы для создания/изменения

### Backend (Kotlin)

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/domain/tag/Tag.kt` | Создать | Data class для тега |
| `server/src/main/kotlin/com/notebox/domain/tag/TagsTable.kt` | Создать | Exposed таблица тегов |
| `server/src/main/kotlin/com/notebox/domain/tag/NoteTagsTable.kt` | Создать | Связующая таблица note_tags |
| `server/src/main/kotlin/com/notebox/domain/tag/TagRepository.kt` | Создать | Репозиторий для тегов |
| `server/src/main/kotlin/com/notebox/domain/tag/TagService.kt` | Создать | Сервис бизнес-логики |
| `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` | Создать | REST контроллер |
| `server/src/main/kotlin/com/notebox/dto/TagDto.kt` | Создать | DTO для тегов |
| `server/src/main/resources/db/migration/V003__add_tags.sql` | Создать | Миграция БД |
| `server/src/main/kotlin/com/notebox/dto/NoteDto.kt` | Изменить | Добавить поле tags |
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Изменить | Загрузка тегов с заметками |

### Frontend (Vue + TypeScript)

| Файл | Действие | Описание |
|------|----------|----------|
| `src/types/index.ts` | Изменить | Добавить Tag interface, tags в Note |
| `src/api/tags.ts` | Создать | API клиент для тегов |
| `src/api/index.ts` | Изменить | Экспорт tagsApi |
| `src/composables/useTags.ts` | Создать | Composable для управления тегами |
| `src/components/NoteTags.vue` | Создать | Компонент отображения/редактирования тегов |
| `src/components/NoteEditor.vue` | Изменить | Добавить NoteTags компонент |
| `src/components/NoteList.vue` | Изменить | Отображение тегов в списке |
| `src/components/TagFilter.vue` | Создать | Фильтр по тегам в сайдбаре |
| `src/components/Sidebar.vue` | Изменить | Добавить TagFilter |

## Детальный план реализации

### 1. Миграция базы данных

```sql
-- V003__add_tags.sql
CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#e5e7eb',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE note_tags (
    note_id VARCHAR(36) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

### 2. Backend модели

**Tag.kt:**
```kotlin
data class Tag(
    val id: String,
    val userId: String,
    val name: String,
    val color: String,
    val createdAt: Instant
)
```

**TagDto.kt:**
```kotlin
data class TagDto(
    val id: String,
    val name: String,
    val color: String
)

data class CreateTagRequest(
    val name: String,
    val color: String? = null
)

data class UpdateTagRequest(
    val name: String?,
    val color: String?
)

data class AddTagsToNoteRequest(
    val tagIds: List<String>
)
```

### 3. REST API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/tags` | Получить все теги пользователя |
| POST | `/api/tags` | Создать новый тег |
| PUT | `/api/tags/{id}` | Обновить тег |
| DELETE | `/api/tags/{id}` | Удалить тег |
| PUT | `/api/notes/{noteId}/tags` | Установить теги для заметки |

### 4. Frontend типы

```typescript
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  // ... существующие поля
  tags?: Tag[];
}
```

### 5. UI компонент NoteTags

Располагается под заголовком заметки в NoteEditor:
- Показывает текущие теги как цветные бейджи
- По клику открывается dropdown (аналогично MultiSelectCell)
- Поиск по существующим тегам
- Создание нового тега при вводе несуществующего имени
- Удаление тега из заметки по клику на "×"

### 6. Фильтрация в сайдбаре

Компонент TagFilter в Sidebar:
- Список всех тегов пользователя с чекбоксами
- Множественный выбор тегов для фильтрации
- Заметки фильтруются по OR (показать заметки с любым из выбранных тегов)

## Критерии приёмки

1. **Создание тегов**
   - [ ] Пользователь может создать новый тег, введя имя в поле поиска
   - [ ] Новый тег автоматически получает цвет из палитры
   - [ ] Тег создаётся и сразу добавляется к заметке

2. **Управление тегами на заметке**
   - [ ] Пользователь видит теги заметки под заголовком
   - [ ] Можно добавить существующий тег из выпадающего списка
   - [ ] Можно удалить тег из заметки кликом на "×"

3. **Отображение тегов**
   - [ ] Теги отображаются с цветным фоном
   - [ ] Теги показываются в списке заметок (NoteList)
   - [ ] Тёмная тема корректно поддерживается

4. **Фильтрация**
   - [ ] В сайдбаре есть секция фильтрации по тегам
   - [ ] Выбор тега фильтрует список заметок
   - [ ] Можно выбрать несколько тегов (OR логика)

5. **Удаление тегов**
   - [ ] Можно удалить тег глобально (удаляется из всех заметок)
   - [ ] Подтверждение перед удалением

6. **Персистентность**
   - [ ] Теги сохраняются в БД
   - [ ] Теги привязаны к пользователю
   - [ ] Теги загружаются вместе с заметками

## Граничные случаи и риски

### Граничные случаи

1. **Дубликаты имён**: Нельзя создать два тега с одинаковым именем (case-insensitive)
2. **Пустое имя**: Валидация — имя тега не может быть пустым
3. **Длинное имя**: Ограничение 100 символов
4. **Много тегов на заметке**: UI должен переносить теги на новую строку
5. **Удаление тега с заметками**: Тег удаляется из всех заметок

### Риски

1. **Производительность**: При большом количестве заметок и тегов фильтрация может быть медленной
   - Митигация: индексы в БД, возможно серверная фильтрация

2. **Совместимость**: Добавление нового поля tags в NoteDto
   - Митигация: поле nullable, старые клиенты игнорируют

## Вне области видимости (Out of Scope)

1. Иерархические теги (вложенные теги)
2. Автоматическое предложение тегов на основе содержимого
3. Шаринг тегов между пользователями
4. Импорт/экспорт тегов
5. Слияние тегов
6. Статистика по тегам
7. Редактирование цвета существующего тега (можно добавить позже)

## Ограничения окружения развёртывания

- Приложение обслуживается по пути `/<project-slug>/`, не в корне
- За nginx reverse proxy по HTTP (без HTTPS)
- API URLs во фронтенде должны быть относительными путями
- Cookie без флага Secure

## Зависимости

- Существующая система аутентификации (user_id для тегов)
- Существующая цветовая палитра `TAG_COLOR_PALETTE`
- Компонент MultiSelectCell как референс для UI

---

*Спецификация создана: 2026-05-03*
*Интервью: не проведено (MCP бэкенд недоступен)*
