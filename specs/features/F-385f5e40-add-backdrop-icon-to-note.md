# Feature: Add Backdrop + Icon to Note

## Summary

Добавление возможности устанавливать обложку (backdrop) и иконку (emoji) для каждой заметки. Это улучшит визуальную идентификацию заметок и приблизит UX к Notion-подобному интерфейсу.

## Requirements Gathered

### Backdrop (Обложка)

| Вопрос | Ответ |
|--------|-------|
| Источник изображений | Загрузка собственных + предустановленные градиенты |
| Предустановленные варианты | Только градиенты (набор готовых) |
| Где отображается | Только в редакторе заметки (баннер над заголовком) |
| Высота баннера | Средний (~200px, как в Notion) |
| Максимальный размер файла | До 5 МБ |
| Позиционирование изображения | С функцией Reposition (drag вверх/вниз) |
| Хранение файлов | Использовать существующий S3 storage |

### Icon (Иконка)

| Вопрос | Ответ |
|--------|-------|
| Тип иконки | Emoji |
| Picker | Полноценный emoji picker с категориями (как в Notion/Slack) |
| Где отображается | В редакторе + в списке заметок рядом с названием |
| Позиция в редакторе | Поверх backdrop, частично выходя за нижнюю границу |

### UI/UX

| Вопрос | Ответ |
|--------|-------|
| Способ добавления | Кнопки "Add cover" / "Add icon" при наведении на область заголовка |
| Удаление | Кнопка "Remove" для backdrop и иконки |

## Files to Create/Modify

### Backend (Kotlin)

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/domain/note/Note.kt` | Modify | Добавить поля `icon`, `backdropType`, `backdropValue`, `backdropPositionY` |
| `server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt` | Modify | Добавить колонки в таблицу |
| `server/src/main/kotlin/com/notebox/dto/NoteDto.kt` | Modify | Добавить новые поля в DTO |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | Modify | Обновить endpoints для новых полей |
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | Modify | Обновить логику сервиса |
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Modify | Обновить SQL-запросы |

### Frontend (Vue.js)

| Файл | Действие | Описание |
|------|----------|----------|
| `src/types/index.ts` | Modify | Добавить новые поля в интерфейс `Note` |
| `src/components/NoteEditor.vue` | Modify | Добавить backdrop-баннер и иконку |
| `src/components/NoteList.vue` | Modify | Отображать иконку рядом с названием |
| `src/components/NoteCover.vue` | Create | Компонент backdrop с hover-actions |
| `src/components/NoteIcon.vue` | Create | Компонент иконки с emoji picker |
| `src/components/EmojiPicker.vue` | Create | Полноценный emoji picker с категориями |
| `src/components/CoverPicker.vue` | Create | Picker для выбора градиента или загрузки изображения |
| `src/api/notes.ts` | Modify | Обновить API-методы |
| `src/composables/useNotes.ts` | Modify | Обновить composable для работы с новыми полями |
| `src/style.css` | Modify | Добавить стили для backdrop и icon |

## Implementation Approach

### 1. Database Schema Changes

Добавить новые поля в таблицу `notes`:

```sql
ALTER TABLE notes ADD COLUMN icon VARCHAR(50);
ALTER TABLE notes ADD COLUMN backdrop_type VARCHAR(20); -- 'gradient' | 'image' | null
ALTER TABLE notes ADD COLUMN backdrop_value TEXT; -- gradient CSS или URL изображения
ALTER TABLE notes ADD COLUMN backdrop_position_y INTEGER DEFAULT 50; -- 0-100, процент вертикального смещения
```

### 2. Backend Implementation

**Note.kt:**
```kotlin
data class Note(
    val id: String,
    val title: String,
    val content: String,
    val folderId: String,
    val icon: String?, // emoji character
    val backdropType: String?, // "gradient" | "image"
    val backdropValue: String?, // gradient CSS или S3 URL
    val backdropPositionY: Int, // 0-100
    val createdAt: Instant,
    val updatedAt: Instant
)
```

### 3. Frontend Implementation

**Структура компонентов:**

```
NoteEditor.vue
├── NoteCover.vue (backdrop banner)
│   ├── hover actions: Change cover, Reposition, Remove
│   └── CoverPicker.vue (modal)
│       ├── GradientGrid (предустановленные градиенты)
│       └── ImageUpload (загрузка файла)
├── NoteIcon.vue (emoji icon)
│   ├── hover action: Change icon
│   └── EmojiPicker.vue (popup)
└── Title + Content
```

**Предустановленные градиенты (10 штук):**
```javascript
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)',
];
```

### 4. Reposition Feature

При клике на "Reposition":
1. Backdrop переходит в режим редактирования
2. Пользователь может drag'ать изображение вверх/вниз
3. Сохраняется `backdropPositionY` (0-100%)
4. CSS: `object-position: center ${backdropPositionY}%`

### 5. File Upload Flow

1. Пользователь выбирает файл (max 5MB, image/*)
2. Frontend отправляет POST `/api/files/upload`
3. Backend загружает в S3, возвращает URL
4. Frontend обновляет заметку с `backdropType: 'image'`, `backdropValue: URL`

## Acceptance Criteria

### Must Have
- [ ] Пользователь может добавить emoji-иконку к заметке
- [ ] Иконка отображается в редакторе над заголовком
- [ ] Иконка отображается в списке заметок рядом с названием
- [ ] Пользователь может добавить backdrop из предустановленных градиентов
- [ ] Пользователь может загрузить собственное изображение как backdrop
- [ ] Backdrop отображается как баннер (~200px) над заголовком в редакторе
- [ ] При наведении на область заголовка появляются кнопки "Add cover" / "Add icon"
- [ ] Пользователь может удалить backdrop и иконку

### Should Have
- [ ] Emoji picker с категориями и поиском
- [ ] Функция Reposition для настройки позиции изображения backdrop
- [ ] Загруженные изображения сохраняются в S3
- [ ] Ограничение размера файла до 5 МБ

### Could Have
- [ ] Анимация при добавлении/удалении backdrop и иконки
- [ ] Предпросмотр градиентов при наведении

## Edge Cases and Risks

### Edge Cases
1. **Большие изображения**: Ограничение 5 МБ на клиенте и сервере
2. **Неподдерживаемые форматы**: Валидация MIME type (только image/*)
3. **Отсутствие S3**: Fallback сообщение об ошибке
4. **Старые заметки без icon/backdrop**: Поля nullable, UI показывает кнопки "Add"
5. **Broken image URL**: Показывать placeholder или скрывать backdrop

### Risks
1. **Emoji rendering**: Разные ОС могут отображать emoji по-разному — использовать нативные emoji
2. **S3 availability**: При недоступности S3 загрузка изображений не будет работать
3. **Performance**: Большие backdrop-изображения могут замедлять загрузку — рекомендуется сжатие на клиенте

## Out of Scope

- Backdrop в списке заметок (только в редакторе)
- Сплошные цвета как вариант backdrop (только градиенты и изображения)
- Паттерны/текстуры для backdrop
- Кастомные иконки (только emoji)
- Изменение размера backdrop пользователем
- Drag-and-drop загрузка изображений (только file picker)
- Unsplash/Giphy интеграция
