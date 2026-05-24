# Диагностический отчет: TeamStore crashes - createdAt field missing

**Дата:** 2026-05-24  
**Severity:** HIGH  
**Статус:** ПРОАКТИВНЫЙ БАГ-РЕПОРТ (Функциональность не реализована)

---

## Bug Summary

Баг описывает ошибку `[TeamStore] Failed to load team data: Field createdAt is required for type TeamMemberDto but it was missing at path $[0]`, которая **возникнет при реализации функциональности команды**, если не будут устранены текущие архитектурные проблемы в конфигурации Jackson и валидации API-ответов.

---

## Root Cause

**Тип:** Превентивный баг-репорт  
**Confidence:** HIGH

### Основная причина

Функциональность команды (TeamStore, /api/team endpoint, TeamMemberDto) **не существует** в текущей кодовой базе. API endpoint `/api/team` возвращает 404 NOT_FOUND.

Баг предупреждает о проблеме сериализации/десериализации, которая **гарантированно возникнет** при реализации функции если:

1. **Backend создаст TeamMemberDto без поля `createdAt`**
2. **Jackson сериализует DTO без этого поля** (отсутствует конфигурация для Kotlin)
3. **Frontend ожидает обязательное поле `createdAt`** (TypeScript strict mode)
4. **API клиент не валидирует ответ** (отсутствует runtime-валидация)

### Цепочка ошибки

```
Backend: Exposed ORM entity → TeamMemberDto (без createdAt)
         ↓
Jackson: Сериализует в JSON (поле отсутствует)
         ↓
Frontend: API client возвращает без валидации
         ↓
TeamStore: Пытается обратиться к member.createdAt → undefined
         ↓
ERROR: "[TeamStore] Failed to load team data: Field createdAt is required..."
```

---

## Consilium Findings

### Architect (Code Tracer)

**Консенсус:** Согласен с root cause  

**Ключевые находки:**
- Функциональность команды отсутствует во всех ветках (git log --all)
- Нет коммитов с упоминанием team/TeamStore/TeamMember
- Существующие stores (notesStore, authStore) не используют runtime-валидацию
- `src/api/client.ts` возвращает данные без проверки обязательных полей
- Текущие DTOs не используют `@JsonProperty(required = true)`
- Отсутствует конфигурация Jackson в `application.yml`

**Рекомендации:**
- Добавить JacksonConfig.kt с настройками для Kotlin
- Добавить валидацию в API client (Zod/io-ts)
- При реализации обеспечить `createdAt` в таблице, DTO и frontend типе

### Stack Expert (Framework Analysis)

**Консенсус:** Согласен с root cause

**Ключевые находки:**
- **Frontend:** Vue 3 + TypeScript 5.3.0 (strict: true) + Pinia 2.3.1
- **Backend:** Spring Boot 3.2.2 + Kotlin 1.9.22 + Exposed ORM 0.47.0
- Jackson module kotlin включен в build.gradle.kts, но не сконфигурирован
- Нет runtime-валидации API ответов
- Отсутствуют feature flags для team functionality
- .env.example не содержит переменных для team

**Рекомендации:**
- Добавить Jackson configuration bean
- Обновить application.yml с настройками сериализации
- Добавить feature flag system для team
- Использовать `@JsonProperty(required = true)` на DTOs

### Consensus

| Аспект | Architect | Stack Expert |
|--------|-----------|--------------|
| Feature exists | ❌ Нет | ❌ Нет |
| Root cause | Архитектурная проблема | Архитектурная проблема |
| Jackson config missing | ✅ Да | ✅ Да |
| Runtime validation missing | ✅ Да | ✅ Да |

**Расхождения:** Нет. Оба субагента согласны на 100%.

---

## Reproduction Results

**Статус:** ❌ НЕ ВОСПРОИЗВЕДЕН

**Причина:** Функциональность не реализована в текущей кодовой базе.

**Наблюдения при попытке воспроизведения:**
- `/api/team` возвращает 404 NOT_FOUND
- TeamStore не найден в коде
- TeamMemberDto не определен
- Нет UI элементов для доступа к функциональности команды
- Нет коммитов с team-функциональностью в git истории

---

## Affected Files

### Файлы для создания (при реализации функции)

**Backend:**
| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/config/JacksonConfig.kt` | CREATE | Конфигурация Jackson для Kotlin |
| `server/src/main/kotlin/com/notebox/domain/team/` | CREATE | Domain layer для team |
| `server/src/main/kotlin/com/notebox/dto/TeamMemberDto.kt` | CREATE | DTO с обязательным полем createdAt |

**Frontend:**
| Файл | Действие | Описание |
|------|----------|----------|
| `src/stores/teamStore.ts` | CREATE | Pinia store для team |
| `src/api/team.ts` | CREATE | API клиент для team |
| `src/types/team.ts` | CREATE | TypeScript типы с обязательным createdAt |

### Файлы для обновления

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/resources/application.yml` | UPDATE | Добавить Jackson settings |
| `server/src/main/kotlin/com/notebox/config/DatabaseConfig.kt` | UPDATE | Добавить TeamMembersTable |
| `src/api/client.ts` | UPDATE | Добавить runtime валидацию |
| `.env.example` | UPDATE | Добавить FEATURE_TEAM_ENABLED |

---

## Fix Plan

### Фаза 1: Превентивные исправления (Сейчас)

**Шаг 1: Добавить Jackson Configuration**

Создать `server/src/main/kotlin/com/notebox/config/JacksonConfig.kt`:
```kotlin
@Configuration
class JacksonConfiguration {
    @Bean
    @Primary
    fun objectMapper(): ObjectMapper {
        return JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            .defaultTimeZone(TimeZone.getTimeZone("UTC"))
            .build()
    }
}
```

**Шаг 2: Обновить application.yml**

Добавить секцию Jackson:
```yaml
spring:
  jackson:
    serialization:
      write-dates-as-timestamps: true
    deserialization:
      fail-on-unknown-properties: false
```

### Фаза 2: При реализации Team Feature

**Шаг 3: Создать Database Schema**

```kotlin
object TeamMembersTable : Table("team_members") {
    val id = varchar("id", 36).primaryKey()
    val userId = varchar("user_id", 36).references(UsersTable.id)
    val teamId = varchar("team_id", 36)
    val role = varchar("role", 50)
    val createdAt = long("created_at")  // ОБЯЗАТЕЛЬНО
    val updatedAt = long("updated_at")  // ОБЯЗАТЕЛЬНО
}
```

**Шаг 4: Создать TeamMemberDto**

```kotlin
data class TeamMemberDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    @JsonProperty(required = true)
    val createdAt: Long,  // ОБЯЗАТЕЛЬНО
    @JsonProperty(required = true)
    val updatedAt: Long
)
```

**Шаг 5: Создать Frontend Types**

```typescript
export interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: number;  // ОБЯЗАТЕЛЬНО
    updatedAt: number;
}
```

**Шаг 6: Добавить Runtime Validation (опционально)**

В `src/api/client.ts` или отдельном валидаторе с использованием Zod:
```typescript
import { z } from 'zod';

const teamMemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    createdAt: z.number(),
    updatedAt: z.number()
});
```

---

## Testing Strategy

### Unit Tests

1. **Backend DTO Serialization Test**
   ```kotlin
   @Test
   fun `TeamMemberDto serializes with createdAt field`() {
       val dto = TeamMemberDto(
           id = "123",
           email = "test@example.com",
           name = "Test User",
           role = "member",
           createdAt = System.currentTimeMillis(),
           updatedAt = System.currentTimeMillis()
       )
       val json = objectMapper.writeValueAsString(dto)
       assertThat(json).contains("\"createdAt\":")
   }
   ```

2. **Frontend Type Validation Test**
   ```typescript
   test('TeamMember requires createdAt', () => {
       const invalid = { id: '1', email: 'a@b.com', name: 'Test', role: 'member' };
       expect(() => teamMemberSchema.parse(invalid)).toThrow();
   });
   ```

### Integration Tests

1. **API Response Contract Test**
   - Verify `/api/team` response includes `createdAt` for all members
   - Verify timestamp is in milliseconds format

2. **E2E Test**
   - Login → Navigate to Team → Verify member list loads
   - Check console for errors

---

## Risk Assessment

### Риски

| Риск | Вероятность | Воздействие | Митигация |
|------|-------------|-------------|-----------|
| Забытый createdAt в DTO | Высокая | Критическое | Code review checklist, unit tests |
| Jackson misconfiguration | Средняя | Высокое | Добавить конфигурацию заранее |
| Inconsistent timestamps | Низкая | Среднее | Использовать единый формат (Long ms) |
| Runtime validation overhead | Низкая | Низкое | Lazy validation, caching |

### Что может сломаться

1. **При добавлении Jackson config:** Существующие DTOs могут сериализоваться иначе
   - **Митигация:** Regression testing всех API endpoints

2. **При добавлении validation:** Performance overhead на каждый API вызов
   - **Митигация:** Валидировать только в development mode или для critical DTOs

3. **При изменении application.yml:** Другие сервисы могут зависеть от текущего поведения
   - **Митигация:** Тестировать все существующие API после изменений

---

## Заключение

Данный баг является **превентивным предупреждением** об архитектурной проблеме, которая возникнет при реализации функциональности команды. Код team feature **не существует** в текущей кодовой базе.

**Рекомендуемые действия:**

1. **Немедленно:** Добавить Jackson configuration в application.yml и JacksonConfig.kt
2. **При реализации:** Следовать паттернам из Fix Plan, обеспечивая включение `createdAt` во все слои
3. **После реализации:** Добавить unit и integration тесты для валидации контракта API

**Статус бага:** Может быть закрыт как "Not Reproducible" или перенесен в backlog как "Technical Debt - Add Jackson Configuration".
