# Диагностический отчёт: Login crash on empty email

**Дата диагностики:** 2026-04-08  
**Серьёзность:** HIGH  
**Статус:** Подтверждён через анализ кода

---

## Краткое описание бага

При попытке входа через OAuth (Google или Apple), если провайдер возвращает пустой email (`""`), приложение не валидирует это значение и создаёт пользователя с пустым email. При повторной попытке входа с пустым email возникает краш из-за нарушения unique constraint в базе данных.

---

## Корневая причина

**Трёхуровневая ошибка валидации** в OAuth flow:

| Уровень | Файл | Строка | Проблема |
|---------|------|--------|----------|
| OAuth Provider | `GoogleOAuthProvider.kt` | 119 | Передаёт `userInfo.email` без проверки на пустую строку |
| OAuth Provider | `AppleOAuthProvider.kt` | 124-125 | Проверяет только `null`, но не пустую строку |
| Business Logic | `UserService.kt` | 44 | Создаёт пользователя без валидации email |
| Database | `UsersTable.kt` | 9 | `uniqueIndex()` позволяет первую пустую строку, но блокирует вторую |

**Коммит, где введён баг:** `f056d16` (начальная реализация OAuth)

**Confidence:** HIGH

---

## Consilium: Результаты анализа субагентов

### Architect (Code Tracer)

**Ключевые находки:**
- Проследил data flow от OAuth callback до краша в базе данных
- Подтвердил 4 точки уязвимости в цепочке аутентификации
- Обнаружил, что security-коммит `0600469` улучшил URL encoding, но пропустил валидацию email
- Выявил архитектурную проблему: Kotlin type system contract нарушен (non-null `String` принимает пустые строки)

**Согласие с корневой причиной:** ДА

### Stack Expert (Framework Analysis)

**Ключевые находки:**
- Kotlin 1.9.22 + Spring Boot 3.2.2 - совместимы, проблем нет
- Exposed ORM 0.47.0 - пустые строки трактуются как distinct values, не как NULL
- PostgreSQL 15 - строго соблюдает UNIQUE constraint на пустых строках
- **КРИТИЧНО:** DatabaseConfig.kt НЕ инициализирует UsersTable, SessionsTable, UserOAuthAccountsTable
- Custom OAuth реализация обходит встроенную валидацию Spring Security OAuth2

**Согласие с корневой причиной:** ДА

### Консенсус

**Полное согласие** между субагентами:
- Корневая причина идентифицирована однозначно
- Файлы для исправления определены
- Рекомендации совпадают

**Разногласия:** Отсутствуют

---

## Результаты воспроизведения

**Статус:** НЕ ВОСПРОИЗВЕДЁН через UI, ПОДТВЕРЖДЁН через анализ кода

**Причина невозможности UI воспроизведения:**
- OAuth провайдеры не настроены в тестовом окружении
- Google OAuth возвращает ошибку 400: `invalid_request - Missing client_id`
- Невозможно контролировать, какой email возвращает реальный OAuth провайдер

**Доказательства из анализа кода:**
- GoogleOAuthProvider.kt:119 - нет проверки `email.isBlank()`
- AppleOAuthProvider.kt:124-125 - проверка `as? String ?: throw` не ловит пустую строку
- UserService.kt:44 - `userRepository.create(email, ...)` вызывается без валидации

---

## Затронутые файлы

| Файл | Требуемое действие |
|------|-------------------|
| `server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt` | Добавить валидацию email (строка 119) |
| `server/src/main/kotlin/com/notebox/domain/auth/AppleOAuthProvider.kt` | Добавить валидацию email (строки 124-125) |
| `server/src/main/kotlin/com/notebox/domain/auth/UserService.kt` | Добавить require(email.isNotBlank()) (строка 44) |
| `server/src/main/kotlin/com/notebox/domain/auth/UsersTable.kt` | Опционально: добавить CHECK constraint |

---

## План исправления

### Шаг 1: GoogleOAuthProvider.kt (строка 119)
**Действие:** Добавить валидацию перед созданием OAuthUserInfo
```kotlin
if (userInfo.email.isBlank()) {
    throw RuntimeException("Google OAuth returned empty email")
}
```

### Шаг 2: AppleOAuthProvider.kt (строки 124-125)
**Действие:** Добавить валидацию после извлечения email
```kotlin
val email = payloadMap["email"] as? String
    ?: throw RuntimeException("Missing 'email' field in Apple ID token")
if (email.isBlank()) {
    throw RuntimeException("Apple OAuth returned empty email")
}
```

### Шаг 3: UserService.kt (строка 44)
**Действие:** Добавить defensive validation в начало метода findOrCreateUserFromOAuth
```kotlin
require(email.isNotBlank()) { "Email cannot be empty" }
```

### Шаг 4 (Опционально): UsersTable.kt (строка 9)
**Действие:** Добавить database-level constraint
```kotlin
val email = varchar("email", 255).uniqueIndex().check { it neq "" }
```

---

## Стратегия тестирования

### Unit Tests
1. **GoogleOAuthProvider** - тест с mock ответом Google API, содержащим пустой email
2. **AppleOAuthProvider** - тест с mock ID token, содержащим пустой email
3. **UserService** - тест вызова findOrCreateUserFromOAuth с пустым email

### Integration Tests
1. OAuth callback flow с mock OAuth server, возвращающим пустой email
2. Проверка, что пользователь с пустым email НЕ создаётся в базе
3. Проверка, что возвращается понятная ошибка пользователю

### Manual Testing
1. Настроить mock OAuth provider
2. Вернуть ответ с `"email": ""`
3. Убедиться, что отображается ошибка "Не удалось получить email от провайдера"

---

## Оценка рисков

### Что может сломаться
1. **Легитимные пользователи без email** - маловероятно, OAuth требует email scope
2. **Существующие пользователи с пустым email в БД** - требуется data migration check

### Митигация
1. Добавить миграцию для проверки существующих пустых email в БД
2. Логировать rejection событий для мониторинга
3. Показать понятное сообщение пользователю при отклонении

### Влияние на пользователей
- **Позитивное:** Предотвращение крашей при OAuth login
- **Негативное:** Минимальное - только edge case с пустым email

### Сложность исправления
- **Код:** Низкая (3-4 строки валидации)
- **Тестирование:** Средняя (требуется mock OAuth)
- **Деплой:** Низкая (нет миграций БД, только код)

---

## Архитектурные уроки

1. **Валидация на границах** - всегда валидировать данные от внешних источников (OAuth providers)
2. **Type System Contracts** - non-null типы должны гарантировать валидность, не только присутствие
3. **Layered Defense** - валидация должна быть на уровне provider, service и database
4. **Database Constraints** - использовать CHECK constraints для бизнес-правил
5. **Test Edge Cases** - OAuth тесты должны включать сценарии с пустыми/отсутствующими полями

---

## Связанные файлы

- `.reproduction-evidence/reproduction-report.md` - детальный отчёт о попытке воспроизведения
- `.reproduction-results.json` - структурированные данные о воспроизведении
- `.diagnostic-results/architect.md` - анализ архитектора
- `.diagnostic-results/stack-expert.md` - анализ эксперта по стеку
