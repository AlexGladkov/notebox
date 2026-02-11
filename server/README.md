# NoteBox Backend

Backend приложения NoteBox на Kotlin + Spring Boot с использованием Exposed ORM и PostgreSQL.

## Технологический стек

- **Язык**: Kotlin 1.9.22
- **Фреймворк**: Spring Boot 3.2.2
- **ORM**: Exposed 0.47.0
- **База данных**: PostgreSQL 15+
- **Хранилище файлов**: S3-совместимое (MinIO для разработки, AWS S3 для продакшена)
- **Сборка**: Gradle 8.5 + Kotlin DSL

## Запуск проекта

### С помощью Docker Compose (рекомендуется)

```bash
# Из корня проекта
docker-compose up --build
```

Это запустит:
- PostgreSQL на порту 5432
- MinIO на портах 9000 (API) и 9001 (Console)
- Backend сервер на порту 8080

### Локальная разработка

1. Запустите PostgreSQL и MinIO:
```bash
docker-compose up postgres minio
```

2. Запустите backend:
```bash
cd server
./gradlew bootRun
```

## API Endpoints

### Folders

- `GET /api/folders` - получить все папки
- `GET /api/folders/{id}` - получить папку по ID
- `POST /api/folders` - создать папку
- `PUT /api/folders/{id}` - обновить папку
- `DELETE /api/folders/{id}` - удалить папку (каскадное удаление)

### Notes

- `GET /api/notes` - получить все заметки
- `GET /api/notes?folderId={id}` - получить заметки в папке
- `GET /api/notes/{id}` - получить заметку по ID
- `POST /api/notes` - создать заметку
- `PUT /api/notes/{id}` - обновить заметку
- `DELETE /api/notes/{id}` - удалить заметку

### Custom Databases

- `GET /api/databases` - список баз данных
- `POST /api/databases` - создать БД
- `GET /api/databases/{id}` - получить БД с колонками
- `PUT /api/databases/{id}` - обновить БД
- `DELETE /api/databases/{id}` - удалить БД

#### Columns

- `POST /api/databases/{id}/columns` - добавить колонку
- `PUT /api/databases/{id}/columns/{cid}` - обновить колонку
- `DELETE /api/databases/{id}/columns/{cid}` - удалить колонку

#### Records

- `GET /api/databases/{id}/records` - получить записи
- `POST /api/databases/{id}/records` - создать запись
- `PUT /api/databases/{id}/records/{rid}` - обновить запись
- `DELETE /api/databases/{id}/records/{rid}` - удалить запись

### Files

- `POST /api/files/upload` - загрузить файл
- `GET /api/files/{key}` - получить URL для скачивания
- `DELETE /api/files/{key}` - удалить файл

## Переменные окружения

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

## Структура проекта

```
server/
├── src/main/kotlin/com/notebox/
│   ├── Application.kt              # Точка входа
│   ├── config/                     # Конфигурация
│   │   ├── DatabaseConfig.kt
│   │   ├── S3Config.kt
│   │   └── CorsConfig.kt
│   ├── domain/                     # Доменная логика
│   │   ├── folder/                 # Папки
│   │   ├── note/                   # Заметки
│   │   ├── database/               # Кастомные БД
│   │   └── storage/                # Файловое хранилище
│   └── dto/                        # Data Transfer Objects
└── src/main/resources/
    └── application.yml             # Конфигурация приложения
```

## Типы колонок

Поддерживаемые типы колонок для кастомных баз данных:

- `TEXT` - текстовое поле
- `NUMBER` - числовое поле
- `BOOLEAN` - логическое поле
- `DATE` - дата
- `SELECT` - одиночный выбор из списка
- `MULTI_SELECT` - множественный выбор из списка
- `FILE` - файл/изображение (хранится в S3/MinIO)
