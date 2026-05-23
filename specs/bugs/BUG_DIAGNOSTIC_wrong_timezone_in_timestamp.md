# Диагностический отчёт: Неправильный часовой пояс в метке "Изменено"

**Дата:** 2026-05-23  
**Severity:** LOW  
**Status:** DIAGNOSED — готов к исправлению

---

## Bug Summary

Метаданные заметки отображают неправильное время "Изменено: 23 мая 2026 г. в 02:12" вместо ожидаемого "22 мая 2026 г. в 20:12 UTC". Время смещено на +6 часов из-за неправильной интерпретации timestamp при чтении из PostgreSQL через JDBC.

---

## Root Cause

**Корневая причина:** Использование `java.sql.ResultSet.getTimestamp(String)` БЕЗ явного параметра `Calendar` в методе `toNoteFromResultSet()`.

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 300-301

```kotlin
createdAt = rs.getTimestamp("created_at")?.toInstant() ?: Instant.now(),
updatedAt = rs.getTimestamp("updated_at")?.toInstant() ?: Instant.now()
```

**Механизм ошибки:**
1. PostgreSQL хранит время в колонке `TIMESTAMP WITHOUT TIME ZONE` (значение 22:12 UTC)
2. При чтении через `rs.getTimestamp()` без явного Calendar, JDBC драйвер интерпретирует значение согласно настройкам JVM/соединения
3. Если JVM работает с часовым поясом UTC+6, драйвер читает 22:12 как локальное время UTC+6
4. При конвертации в Instant получается неправильное значение
5. Frontend получает уже неправильный timestamp и верно отображает неверные данные

**Уровень уверенности:** ВЫСОКИЙ — подтверждено анализом кода и архитектурных паттернов

---

## Consilium Findings

### Architect (Code Tracer)

**Корневая причина согласована:** ДА

**Ключевые находки:**
- Идентифицирован проблемный код в `NoteRepository.kt:300-301`
- Обнаружена архитектурная проблема: две разные функции маппинга (`toNote()` через Exposed DSL — безопасно, `toNoteFromResultSet()` через JDBC — опасно)
- Raw SQL запросы с CTE обходят защиту ORM для обработки timestamp
- Commit `08d65782` (2026-05-20) добавил nullable handling, но не исправил основную проблему с timezone

**Затронутые модули:**
| Модуль | Файл | Критичность |
|--------|------|-------------|
| NoteRepository | `server/.../NoteRepository.kt` | КРИТИЧНО |
| NotesTable | `server/.../NotesTable.kt` | ВЫСОКО |
| Application Config | `application.yml` | СРЕДНЕ |

### Stack Expert (Technology Analysis)

**Корневая причина согласована:** ДА

**Ключевые находки:**
- Exposed ORM 0.47.0 не поддерживает `TIMESTAMP WITH TIME ZONE` через API
- Отсутствует параметр `TimeZone=UTC` в JDBC URL
- Docker-контейнеры не имеют явной настройки TZ
- Проблема затрагивает ВСЕ таблицы с timestamp полями (9 таблиц)

**Конфигурационные проблемы:**
1. `application.yml` — JDBC URL без параметра TimeZone
2. `docker-compose.yml` — нет TZ переменной для PostgreSQL
3. `Dockerfile` — нет JAVA_TOOL_OPTIONS для timezone

---

## Consensus

**Согласие субагентов:** ПОЛНОЕ

Оба субагента идентифицировали одну и ту же корневую причину:
- `rs.getTimestamp()` без явного timezone параметра в `NoteRepository.kt:300-301`
- Использование `TIMESTAMP WITHOUT TIME ZONE` в PostgreSQL

**Расхождения:** Нет существенных расхождений. Stack Expert добавил важный контекст о конфигурации инфраструктуры (Docker, JDBC URL), который дополняет анализ Architect.

---

## Reproduction Results

**Статус воспроизведения:** НЕ УДАЛОСЬ ВОСПРОИЗВЕСТИ ЧЕРЕЗ UI

**Причина:** Демо-режим возвращает 403 Forbidden (известная проблема инфраструктуры)

**Альтернативная верификация:** Анализ исходного кода подтвердил наличие проблемы:
- База данных использует `TIMESTAMP WITHOUT TIME ZONE`
- JDBC чтение происходит без явного UTC Calendar
- Frontend код корректен — проблема в данных, получаемых с backend

---

## Affected Files

### Файлы требующие изменений:

1. **`server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`** (строки 300-301)
   - Действие: ИЗМЕНИТЬ — добавить явный UTC Calendar к `getTimestamp()`

2. **`server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt`** (строки 18-19)
   - Действие: ИЗМЕНИТЬ — использовать `timestampWithTimeZone()` или добавить миграцию

3. **`server/src/main/resources/application.yml`** (строка 10)
   - Действие: ИЗМЕНИТЬ — добавить `?TimeZone=UTC` к JDBC URL

4. **`docker-compose.yml`**
   - Действие: ИЗМЕНИТЬ — добавить `TZ: 'UTC'` к PostgreSQL сервису

5. **Database migration** (новый файл)
   - Действие: СОЗДАТЬ — миграция для изменения типа колонок

### Файлы НЕ требующие изменений:

- `src/components/BlockEditor/cells/LastEditedTimeCell.vue` — код корректен
- `server/src/main/kotlin/com/notebox/domain/note/Note.kt` — код корректен
- `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` — код корректен

---

## Fix Plan

### Шаг 1: Добавить явный UTC Calendar в JDBC (КРИТИЧНО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`

```kotlin
// Добавить импорт
import java.util.Calendar
import java.util.TimeZone

// Изменить строки 300-301
private fun toNoteFromResultSet(rs: java.sql.ResultSet): Note {
    val utcCalendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    return Note(
        id = rs.getString("id"),
        // ... остальные поля ...
        createdAt = rs.getTimestamp("created_at", utcCalendar)?.toInstant() ?: Instant.now(),
        updatedAt = rs.getTimestamp("updated_at", utcCalendar)?.toInstant() ?: Instant.now()
    )
}
```

### Шаг 2: Добавить TimeZone параметр в JDBC URL (ВЫСОКО)

**Файл:** `server/src/main/resources/application.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5432}/${POSTGRES_DB:notebox}?TimeZone=UTC
```

### Шаг 3: Настроить timezone в Docker (СРЕДНЕ)

**Файл:** `docker-compose.yml`

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-notebox}
    POSTGRES_USER: ${POSTGRES_USER:-notebox}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-notebox}
    TZ: 'UTC'
```

### Шаг 4 (Опционально): Изменить тип колонок в БД

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt`

```kotlin
// Использовать кастомный тип для TIMESTAMP WITH TIME ZONE
val createdAt = timestampWithTimeZone("created_at").default(Instant.now())
val updatedAt = timestampWithTimeZone("updated_at").default(Instant.now())
```

**Миграция:**
```sql
ALTER TABLE notes 
  ALTER COLUMN created_at TYPE timestamp with time zone,
  ALTER COLUMN updated_at TYPE timestamp with time zone;
```

**Примечание:** Шаг 4 требует проверки совместимости с Exposed ORM 0.47.0. Шаги 1-3 являются минимально необходимым исправлением.

---

## Testing Strategy

### Unit Tests

```kotlin
@Test
fun `timestamp should be consistent between Exposed DSL and raw SQL`() {
    val beforeCreate = Instant.now()
    val note = repository.create(userId, "Test", "Content")
    val afterCreate = Instant.now()
    
    // Получить через Exposed DSL
    val noteViaDsl = repository.findById(note.id)!!
    
    // Получить через raw SQL (метод использующий toNoteFromResultSet)
    val noteViaRawSql = repository.findAllDescendants(note.id).firstOrNull { it.id == note.id }
    
    // Timestamps должны быть идентичны
    assertEquals(noteViaDsl.updatedAt, noteViaRawSql?.updatedAt)
    
    // Timestamps должны быть в ожидаемом диапазоне UTC
    assertTrue(noteViaDsl.updatedAt in beforeCreate..afterCreate)
}
```

### Integration Tests

1. Создать заметку через API
2. Проверить, что `updatedAt` в response соответствует текущему UTC времени (±1 секунда)
3. Получить ту же заметку через разные endpoints
4. Убедиться, что timestamps идентичны

### E2E Tests

1. Открыть приложение в браузере (часовой пояс != UTC)
2. Создать новую заметку
3. Проверить, что "Изменено:" отображает время в локальном часовом поясе браузера
4. Сравнить с `new Date().toLocaleString()` — должно быть идентично (±1 минута)

---

## Risk Assessment

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Изменение JDBC URL сломает существующие соединения | НИЗКАЯ | НИЗКОЕ | Параметр TimeZone=UTC просто делает явным дефолтное поведение |
| Миграция БД на TIMESTAMP WITH TIME ZONE повредит данные | СРЕДНЯЯ | ВЫСОКОЕ | Отложить миграцию, использовать только Calendar fix |
| Calendar fix не решит проблему полностью | НИЗКАЯ | СРЕДНЕЕ | Добавить timezone параметр к JDBC URL как дополнительную защиту |

### Рекомендуемый подход

**Минимальное исправление (рекомендуется):**
- Шаг 1 (Calendar в NoteRepository) — обязателен
- Шаг 2 (JDBC URL) — обязателен
- Шаг 3 (Docker TZ) — рекомендуется

**Полное исправление (долгосрочное):**
- Все шаги включая миграцию БД
- Требует дополнительного тестирования и планирования

---

## Related Issues

- `TESTING_INFRASTRUCTURE_ISSUE.md` — проблема с демо-режимом (403 Forbidden)
- `specs/bugs/BUG_DIAGNOSTIC_demo_mode_not_working.md` — связанный баг инфраструктуры

---

## Appendix: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WRITE PATH (✅ OK)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Vue UI                                                                 │
│     │                                                                   │
│     ↓ HTTP POST/PUT                                                     │
│  NoteController.createNote()                                            │
│     │                                                                   │
│     ↓                                                                   │
│  NoteService.createNote()                                               │
│     │                                                                   │
│     ↓ val now = Instant.now() [CORRECT: always UTC]                     │
│  NoteRepository.create()                                                │
│     │                                                                   │
│     ↓ INSERT INTO notes ... VALUES(now)                                 │
│  PostgreSQL (TIMESTAMP WITHOUT TIME ZONE)                               │
│     │                                                                   │
│     ↓ Stores: 2026-05-22 20:12:00 (no timezone info)                    │
│  ✅ Data stored correctly as UTC value                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              READ PATH (❌ BUG)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL                                                             │
│     │                                                                   │
│     ↓ SELECT updated_at FROM notes ...                                  │
│  JDBC Driver (rs.getTimestamp() WITHOUT Calendar)                       │
│     │                                                                   │
│     ↓ Interprets 20:12 as local time (if JVM != UTC)                   │
│  ❌ PROBLEM: 20:12 interpreted as UTC+6 → converts to 02:12 next day    │
│     │                                                                   │
│     ↓ .toInstant() → wrong Instant value                                │
│  NoteRepository.toNoteFromResultSet()                                   │
│     │                                                                   │
│     ↓ Note(updatedAt = wrongInstant)                                    │
│  Note.toDto() → createdAt.toEpochMilli()                                │
│     │                                                                   │
│     ↓ HTTP Response: { "updatedAt": wrongMillis }                       │
│  Vue UI (LastEditedTimeCell.vue)                                        │
│     │                                                                   │
│     ↓ new Date(wrongMillis).toLocaleString()                            │
│  ❌ Display: "23 мая 2026 г. в 02:12" (wrong!)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**Отчёт подготовлен:** 2026-05-23  
**Методология:** Consilium (параллельный анализ субагентами)  
**Субагенты:** Architect, Stack Expert
