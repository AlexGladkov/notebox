# F-7105df84: Базовый контент в демо-режиме

## Summary

Добавление предустановленного демонстрационного контента при входе в демо-режим. Контент показывает возможности платформы (чек-листы, вложенные страницы, базы данных, callout-блоки и др.) в рамках связанной тематики. При каждом входе в демо-режим данные сбрасываются к начальному состоянию.

## Requirements (Собранные требования)

### Тематика демо-контента
- **Тема**: Персональная продуктивность / планирование
- Демо-данные представляют рабочее пространство пользователя с задачами, целями и заметками
- Все данные логически связаны между собой

### Структура демо-контента

#### Главная страница "Мой Dashboard"
- Приветственный заголовок с описанием NoteBox
- Callout-блок (info) с объяснением демо-режима
- Ссылки на вложенные страницы
- База данных "Мои задачи" с примерами задач

#### Вложенные страницы

1. **"Цели на месяц"**
   - Заголовки H2/H3
   - Task list (чек-листы) с целями
   - Callout-блоки (success/warning)

2. **"Идеи для проектов"**
   - Bullet list с идеями
   - Blockquote с цитатой
   - Code block с примером

3. **"Рабочие заметки"**
   - Обычный текст с форматированием
   - Numbered list
   - Вложенная страница второго уровня "Важные контакты"

### Компоненты для демонстрации
Каждый из компонентов должен присутствовать в демо-контенте:
- [x] Заголовки (H1, H2, H3)
- [x] Маркированный список (bullet list)
- [x] Нумерованный список (numbered list)
- [x] Чек-листы (task list)
- [x] Цитата (blockquote)
- [x] Блок кода (code block)
- [x] Разделитель (divider)
- [x] Callout-блоки (info, warning, success)
- [x] Вложенные страницы (nested notes)
- [x] База данных с записями
- [x] Ссылки между страницами

### Сброс данных
- **Момент сброса**: При каждом входе в демо-режим (POST /api/auth/demo)
- **Механизм**: Удаление всех данных демо-пользователя и создание новых
- **Что удаляется**: Заметки, базы данных, записи в базах данных
- **Без предупреждения**: Сброс происходит автоматически, пользователь предупрежден в баннере демо-режима

### UX
- Демо-пользователь сразу видит наполненное рабочее пространство
- Может редактировать, удалять, создавать новые данные
- При выходе и повторном входе — всё сбрасывается к начальному состоянию
- Баннер демо-режима должен информировать: "Демо-режим — данные сбрасываются при каждом входе"

## Files to Create/Modify

### Backend (Kotlin/Spring)

#### Новые файлы:
1. `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt`
   - Сервис для создания демо-контента
   - Методы: `createDemoContent(userId: String)`, `clearDemoData(userId: String)`
   - Создаёт структуру заметок, баз данных и записей

2. `server/src/main/kotlin/com/notebox/domain/demo/DemoContentData.kt`
   - Data class с шаблонами демо-контента
   - JSON-структуры для редактора TipTap
   - Константы с текстами и структурой страниц

#### Модификации:
1. `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`
   - Добавить вызов `demoContentService.clearDemoData()` перед созданием сессии
   - Добавить вызов `demoContentService.createDemoContent()` после очистки

2. `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`
   - Добавить метод `deleteAllByUserId(userId: String)` для очистки заметок

3. `server/src/main/kotlin/com/notebox/domain/database/DatabaseRepository.kt`
   - Добавить метод `deleteAllByUserId(userId: String)` для очистки баз данных

### Frontend (Vue 3)

#### Модификации:
1. `src/components/layout/DemoBanner.vue`
   - Обновить текст баннера: "Демо-режим — данные сбрасываются при каждом входе"

## Implementation Approach

### Phase 1: Backend — Очистка данных демо-пользователя

1. **Добавить методы удаления в репозитории**
   ```kotlin
   // NoteRepository
   fun deleteAllByUserId(userId: String)
   
   // DatabaseRepository  
   fun deleteAllByUserId(userId: String)
   ```

2. **Создать DemoContentService**
   ```kotlin
   @Service
   class DemoContentService(
       private val noteService: NoteService,
       private val noteRepository: NoteRepository,
       private val databaseService: DatabaseService,
       private val databaseRepository: DatabaseRepository
   ) {
       fun clearDemoData(userId: String) {
           databaseRepository.deleteAllByUserId(userId)
           noteRepository.deleteAllByUserId(userId)
       }
       
       fun createDemoContent(userId: String) {
           // Создание демо-контента
       }
   }
   ```

### Phase 2: Backend — Создание демо-контента

1. **Создать DemoContentData с шаблонами**
   - TipTap JSON структуры для каждой страницы
   - Структура вложенности страниц
   - Данные для базы данных (колонки, записи)

2. **Реализовать createDemoContent()**
   - Создать главную страницу "Мой Dashboard"
   - Создать вложенные страницы
   - Создать базу данных "Мои задачи"
   - Добавить записи в базу данных
   - Вставить ссылки между страницами

### Phase 3: Интеграция с DemoAuthProvider

1. **Обновить createDemoSession()**
   ```kotlin
   fun createDemoSession(): Pair<User, Session> {
       if (!demoModeEnabled) {
           throw IllegalStateException("Demo mode is not enabled")
       }
       
       // Get or create demo user
       val demoUser = userService.findByEmail(DEMO_EMAIL)
           ?: userService.createUser(DEMO_EMAIL, DEMO_NAME, null)
       
       // Сбросить демо-данные
       demoContentService.clearDemoData(demoUser.id)
       
       // Создать свежий демо-контент
       demoContentService.createDemoContent(demoUser.id)
       
       // Create session for demo user
       val session = sessionService.createSession(demoUser.id)
       
       return Pair(demoUser, session)
   }
   ```

### Phase 4: Frontend — Обновление баннера

1. **Обновить текст в DemoBanner.vue**
   - Изменить сообщение на более информативное о сбросе данных

## Демо-контент: Детальная структура

### Главная страница: "Мой Dashboard"

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Добро пожаловать в NoteBox!" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Это ваше персональное рабочее пространство..." }] },
    { "type": "callout", "attrs": { "type": "info" }, "content": [{ "type": "text", "text": "Это демо-режим..." }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Быстрый доступ" }] },
    { "type": "paragraph", "content": [
      { "type": "text", "text": "📄 ", "marks": [] },
      { "type": "text", "text": "Цели на месяц", "marks": [{ "type": "link", "attrs": { "href": "/notes/{ID_GOALS}" }}] }
    ]},
    { "type": "horizontalRule" },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Мои задачи" }] },
    { "type": "database", "attrs": { "databaseId": "{DATABASE_ID}" } }
  ]
}
```

### Страница: "Цели на месяц"

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Цели на месяц" }] },
    { "type": "callout", "attrs": { "type": "success" }, "content": [{ "type": "text", "text": "Отличный месяц для новых достижений!" }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Профессиональные цели" }] },
    { "type": "taskList", "content": [
      { "type": "taskItem", "attrs": { "checked": true }, "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Завершить проект X" }] }] },
      { "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Изучить новый фреймворк" }] }] }
    ]},
    { "type": "callout", "attrs": { "type": "warning" }, "content": [{ "type": "text", "text": "Дедлайн: конец месяца!" }] }
  ]
}
```

### Страница: "Идеи для проектов"

```json
{
  "type": "doc", 
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Идеи для проектов" }] },
    { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Лучший способ предсказать будущее — создать его." }] }] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Мобильное приложение для трекинга привычек" }] }] },
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Телеграм-бот для заметок" }] }] }
    ]},
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Пример кода" }] },
    { "type": "codeBlock", "attrs": { "language": "javascript" }, "content": [{ "type": "text", "text": "const greeting = 'Hello, NoteBox!';\nconsole.log(greeting);" }] }
  ]
}
```

### База данных: "Мои задачи"

**Колонки:**
- Название (text, primary)
- Статус (select: "К выполнению", "В процессе", "Готово")
- Приоритет (select: "Низкий", "Средний", "Высокий")

**Записи:**
1. "Подготовить презентацию" | "В процессе" | "Высокий"
2. "Ответить на письма" | "К выполнению" | "Средний"
3. "Обновить документацию" | "Готово" | "Низкий"
4. "Созвон с командой" | "К выполнению" | "Высокий"

## Acceptance Criteria

1. [ ] При входе в демо-режим пользователь видит предзаполненный контент
2. [ ] Главная страница "Мой Dashboard" содержит приветствие, ссылки и базу данных
3. [ ] Присутствуют 3+ вложенные страницы с разным контентом
4. [ ] База данных "Мои задачи" содержит 4+ записи с разными статусами
5. [ ] Все типы блоков (H1-H3, списки, чек-листы, цитаты, код, callouts, dividers) представлены в демо-контенте
6. [ ] При выходе и повторном входе в демо — данные сбрасываются к начальному состоянию
7. [ ] Редактирование демо-данных работает без ошибок
8. [ ] Баннер демо-режима информирует о сбросе данных
9. [ ] Производительность: создание демо-контента занимает < 500ms

## Edge Cases and Risks

### Edge Cases

1. **Одновременный вход нескольких пользователей в демо**
   - Риск: Race condition при сбросе данных
   - Решение: Данные привязаны к одному демо-пользователю, последний вошедший получит свежие данные

2. **Ошибка при создании демо-контента**
   - Риск: Пустой демо-аккаунт
   - Решение: Логирование ошибок, fallback к пустому состоянию (как сейчас)

3. **Большой объём данных, созданных пользователем**
   - Риск: Долгая очистка при следующем входе
   - Решение: Cascade delete в БД, индексы на userId

4. **Удалённая база данных из демо-контента**
   - Пользователь может удалить демо-базу данных — это нормальное поведение, при следующем входе она восстановится

### Security Considerations

- Демо-данные не содержат конфиденциальной информации
- Очистка данных происходит полностью (каскадное удаление)
- Нет доступа к данным других пользователей

### Performance Considerations

- Создание 4-5 заметок + 1 база данных с 4 записями: ~100-300ms
- Очистка данных через каскадное удаление: ~50-100ms
- Общее время входа в демо: < 500ms

## Out of Scope

Следующие функции явно исключены из текущей реализации:

1. ❌ Настройка темы демо-контента (выбор пользователем)
2. ❌ Частичный сброс (сохранение некоторых данных)
3. ❌ Предупреждение перед сбросом при повторном входе
4. ❌ Изображения/файлы в демо-контенте
5. ❌ Мультиязычный демо-контент
6. ❌ A/B тестирование разных вариантов демо
7. ❌ Метрики использования демо-контента

## Technical Notes

### TipTap JSON формат

Контент редактора хранится в формате TipTap JSON. Важные типы узлов:
- `doc` — корневой узел
- `heading` с атрибутом `level` (1-3)
- `paragraph` — обычный текст
- `bulletList`, `orderedList` — списки
- `taskList` с `taskItem` — чек-листы
- `blockquote` — цитаты
- `codeBlock` — блоки кода
- `callout` с атрибутом `type` — выноски
- `database` с атрибутом `databaseId` — встроенная БД
- `horizontalRule` — разделитель

### Ссылки между страницами

Ссылки на страницы используют формат:
```json
{
  "type": "text",
  "text": "Название страницы",
  "marks": [{ "type": "link", "attrs": { "href": "/notes/{noteId}" }}]
}
```

### Порядок создания

1. Создать все заметки (без ссылок)
2. Создать базу данных и записи
3. Обновить контент заметок с правильными ID ссылок и базы данных

## Dependencies

- Существующий демо-режим (F-9ec58c90-demo-mode)
- NoteService, NoteRepository
- DatabaseService, DatabaseRepository
