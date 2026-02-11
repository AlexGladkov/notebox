# Feature Specification: Add Backend Side

**Feature ID:** F-4f7a3d9f
**Created:** 2026-02-11
**Status:** Draft

## Summary

Добавление backend-части приложения NoteBox для хранения данных в PostgreSQL вместо localStorage. Backend будет реализован на Kotlin + Spring Boot с использованием Exposed ORM. Также будет подготовлен базовый API для создания кастомных баз данных (как в Notion) с поддержкой различных типов колонок.

## Requirements Gathered

### Архитектура
- **Структура:** Monorepo — бэкенд добавляется в папку `server/` текущего репозитория
- **Технологический стек:** Kotlin + Spring Boot
- **ORM:** Exposed (JetBrains) — Kotlin DSL для SQL
- **База данных:** PostgreSQL
- **Система сборки:** Gradle с Kotlin DSL
- **API формат:** REST API
- **Контейнеризация:** Полный docker-compose (PostgreSQL, MinIO, приложение)

### Аутентификация
- **Текущая фаза:** Без аутентификации — будет добавлена в будущих итерациях

### Хранение файлов
- **Решение:** S3-совместимое хранилище (MinIO для локальной разработки, AWS S3 для продакшена)

### Миграция данных
- **Стратегия:** Полная замена localStorage на API — существующие данные в localStorage не мигрируются

### Scope текущей фазы
1. Перенос существующих сущностей (Folders, Notes) в PostgreSQL
2. REST API для CRUD операций с Folders и Notes
3. Базовый API для кастомных баз данных:
   - Создание/удаление таблиц (databases)
   - Управление колонками
   - CRUD для записей
4. Поддерживаемые типы колонок:
   - Text
   - Number
   - Boolean
   - Date
   - Select (одиночный выбор)
   - Multi-select (множественный выбор)
   - File/Image (с хранением в S3/MinIO)

## Files to Create

### Backend (server/)
```
server/
├── build.gradle.kts
├── settings.gradle.kts
├── Dockerfile
├── src/main/kotlin/com/notebox/
│   ├── Application.kt
│   ├── config/
│   │   ├── DatabaseConfig.kt
│   │   ├── S3Config.kt
│   │   └── CorsConfig.kt
│   ├── domain/
│   │   ├── folder/
│   │   │   ├── Folder.kt (entity)
│   │   │   ├── FolderTable.kt (Exposed table)
│   │   │   ├── FolderRepository.kt
│   │   │   ├── FolderService.kt
│   │   │   └── FolderController.kt
│   │   ├── note/
│   │   │   ├── Note.kt
│   │   │   ├── NoteTable.kt
│   │   │   ├── NoteRepository.kt
│   │   │   ├── NoteService.kt
│   │   │   └── NoteController.kt
│   │   └── database/
│   │       ├── CustomDatabase.kt
│   │       ├── CustomDatabaseTable.kt
│   │       ├── Column.kt
│   │       ├── ColumnTable.kt
│   │       ├── Record.kt
│   │       ├── RecordTable.kt
│   │       ├── DatabaseRepository.kt
│   │       ├── DatabaseService.kt
│   │       └── DatabaseController.kt
│   ├── storage/
│   │   ├── FileStorageService.kt
│   │   └── S3StorageService.kt
│   └── dto/
│       ├── FolderDto.kt
│       ├── NoteDto.kt
│       ├── DatabaseDto.kt
│       ├── ColumnDto.kt
│       └── RecordDto.kt
└── src/main/resources/
    └── application.yml
```

### Infrastructure
```
docker-compose.yml
.env.example
```

### Frontend Changes (src/)
```
src/
├── api/
│   ├── client.ts (axios/fetch wrapper)
│   ├── folders.ts
│   ├── notes.ts
│   └── databases.ts
├── composables/
│   ├── useStorage.ts (полностью переписать для работы с API)
│   ├── useFolders.ts (обновить для использования API)
│   └── useNotes.ts (обновить для использования API)
└── types/
    └── index.ts (добавить типы для кастомных баз данных)
```

## Implementation Approach

### Phase 1: Backend Infrastructure

1. **Создать структуру Gradle проекта**
   - Настроить `build.gradle.kts` с зависимостями:
     - Spring Boot Starter Web
     - Exposed (core, dao, jdbc, spring-boot-starter)
     - PostgreSQL driver
     - AWS SDK for S3
     - Jackson для JSON
   - Настроить `application.yml` с конфигурацией БД и S3

2. **Настроить Docker окружение**
   - `docker-compose.yml` с сервисами:
     - `postgres` (PostgreSQL 15+)
     - `minio` (S3-совместимое хранилище)
     - `server` (Spring Boot приложение)
   - Volume для персистентности данных
   - Сеть для связи между контейнерами

3. **Настроить Exposed**
   - `DatabaseConfig.kt` — подключение к PostgreSQL
   - Автоматическое создание таблиц при старте

### Phase 2: Core Entities API

4. **Реализовать Folder API**
   ```kotlin
   // Endpoints:
   GET    /api/folders          - получить все папки
   GET    /api/folders/{id}     - получить папку по ID
   POST   /api/folders          - создать папку
   PUT    /api/folders/{id}     - обновить папку
   DELETE /api/folders/{id}     - удалить папку (и вложенные)
   ```

5. **Реализовать Note API**
   ```kotlin
   // Endpoints:
   GET    /api/notes                    - получить все заметки
   GET    /api/notes?folderId={id}      - получить заметки в папке
   GET    /api/notes/{id}               - получить заметку по ID
   POST   /api/notes                    - создать заметку
   PUT    /api/notes/{id}               - обновить заметку
   DELETE /api/notes/{id}               - удалить заметку
   ```

### Phase 3: Custom Databases API

6. **Схема для кастомных баз данных**
   ```sql
   -- Таблица для хранения "баз данных" (аналог Notion database)
   CREATE TABLE custom_databases (
       id UUID PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       folder_id UUID REFERENCES folders(id),
       created_at TIMESTAMP,
       updated_at TIMESTAMP
   );

   -- Таблица для колонок
   CREATE TABLE columns (
       id UUID PRIMARY KEY,
       database_id UUID REFERENCES custom_databases(id),
       name VARCHAR(255) NOT NULL,
       type VARCHAR(50) NOT NULL, -- TEXT, NUMBER, BOOLEAN, DATE, SELECT, MULTI_SELECT, FILE
       options JSONB, -- для SELECT/MULTI_SELECT хранит доступные опции
       position INT NOT NULL,
       created_at TIMESTAMP
   );

   -- Таблица для записей (строк)
   CREATE TABLE records (
       id UUID PRIMARY KEY,
       database_id UUID REFERENCES custom_databases(id),
       data JSONB NOT NULL, -- {column_id: value, ...}
       created_at TIMESTAMP,
       updated_at TIMESTAMP
   );

   -- Таблица для файлов
   CREATE TABLE files (
       id UUID PRIMARY KEY,
       record_id UUID REFERENCES records(id),
       column_id UUID REFERENCES columns(id),
       filename VARCHAR(255) NOT NULL,
       s3_key VARCHAR(500) NOT NULL,
       content_type VARCHAR(100),
       size BIGINT,
       created_at TIMESTAMP
   );
   ```

7. **Реализовать Database API**
   ```kotlin
   // Endpoints:
   GET    /api/databases                     - список баз данных
   POST   /api/databases                     - создать БД
   GET    /api/databases/{id}                - получить БД с колонками
   PUT    /api/databases/{id}                - обновить БД
   DELETE /api/databases/{id}                - удалить БД

   POST   /api/databases/{id}/columns        - добавить колонку
   PUT    /api/databases/{id}/columns/{cid}  - обновить колонку
   DELETE /api/databases/{id}/columns/{cid}  - удалить колонку

   GET    /api/databases/{id}/records        - получить записи
   POST   /api/databases/{id}/records        - создать запись
   PUT    /api/databases/{id}/records/{rid}  - обновить запись
   DELETE /api/databases/{id}/records/{rid}  - удалить запись
   ```

8. **Реализовать File Storage**
   ```kotlin
   // Endpoints:
   POST   /api/files/upload                  - загрузить файл
   GET    /api/files/{id}                    - получить URL для скачивания
   DELETE /api/files/{id}                    - удалить файл
   ```

### Phase 4: Frontend Integration

9. **Создать API клиент**
   - `api/client.ts` — базовый HTTP клиент с обработкой ошибок
   - Типизированные функции для каждого endpoint

10. **Обновить composables**
    - `useStorage.ts` — полностью переписать для работы с REST API
    - `useFolders.ts` — использовать API вместо localStorage
    - `useNotes.ts` — использовать API вместо localStorage
    - Добавить loading и error состояния

11. **Обновить компоненты**
    - Добавить индикаторы загрузки
    - Обработка ошибок сети
    - Оптимистичные обновления UI (опционально)

## Data Models

### Existing Types (to preserve compatibility)
```typescript
interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
}
```

### New Types for Custom Databases
```typescript
type ColumnType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'FILE';

interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

interface Column {
  id: string;
  databaseId: string;
  name: string;
  type: ColumnType;
  options?: SelectOption[]; // для SELECT/MULTI_SELECT
  position: number;
  createdAt: number;
}

interface CustomDatabase {
  id: string;
  name: string;
  folderId: string | null;
  columns: Column[];
  createdAt: number;
  updatedAt: number;
}

interface Record {
  id: string;
  databaseId: string;
  data: { [columnId: string]: any };
  createdAt: number;
  updatedAt: number;
}

interface FileAttachment {
  id: string;
  recordId: string;
  columnId: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: number;
}
```

## Acceptance Criteria

### Backend
- [ ] Spring Boot приложение запускается без ошибок
- [ ] PostgreSQL подключается и таблицы создаются автоматически
- [ ] CRUD операции для Folders работают корректно
- [ ] CRUD операции для Notes работают корректно
- [ ] API для кастомных баз данных возвращает корректные ответы
- [ ] Загрузка файлов в MinIO работает
- [ ] Скачивание файлов из MinIO работает
- [ ] Docker-compose поднимает все сервисы

### Frontend
- [ ] Приложение корректно загружает папки с сервера
- [ ] Приложение корректно загружает заметки с сервера
- [ ] Создание/редактирование/удаление папок работает через API
- [ ] Создание/редактирование/удаление заметок работает через API
- [ ] Отображаются индикаторы загрузки
- [ ] Ошибки сети отображаются пользователю

### Integration
- [ ] Frontend успешно взаимодействует с backend
- [ ] CORS настроен корректно
- [ ] Данные сохраняются между перезапусками

## Edge Cases and Risks

### Edge Cases
1. **Удаление папки с вложенными элементами** — каскадное удаление всех подпапок, заметок и баз данных
2. **Потеря соединения с сервером** — отображение ошибки, retry механизм
3. **Большие файлы** — ограничение размера (например, 10MB), multipart upload
4. **Конкурентное редактирование** — пока не обрабатываем, last-write-wins
5. **Невалидные данные в колонках** — валидация на backend по типу колонки

### Risks
1. **Производительность JSONB для больших таблиц** — для первой версии приемлемо, позже можно оптимизировать индексами
2. **Миграция схемы БД** — пока ручная, в будущем добавить Flyway/Liquibase
3. **S3 недоступен** — приложение не должно падать, файловые операции должны возвращать понятные ошибки

## Out of Scope

1. **Аутентификация и авторизация** — будет в следующей итерации
2. **UI для кастомных баз данных** — только API в этой фазе
3. **Связи между таблицами** (relations) — не в scope
4. **Формулы и вычисляемые поля** — не в scope
5. **Real-time синхронизация** (WebSocket) — не в scope
6. **Версионирование заметок** — не в scope
7. **Экспорт/импорт данных** — не в scope
8. **Полнотекстовый поиск** — используем LIKE, без Elasticsearch

## API Response Format

Все API endpoints возвращают данные в формате:
```json
{
  "data": { ... },
  "error": null
}
```

При ошибке:
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Folder not found"
  }
}
```

HTTP коды:
- 200 — успешный GET/PUT
- 201 — успешный POST (создание)
- 204 — успешный DELETE
- 400 — ошибка валидации
- 404 — ресурс не найден
- 500 — внутренняя ошибка сервера

## Environment Variables

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=notebox
POSTGRES_USER=notebox
POSTGRES_PASSWORD=notebox

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=notebox-files
S3_REGION=us-east-1

# Server
SERVER_PORT=8080
```
