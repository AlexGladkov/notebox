# Диагностический отчёт: SessionService не инвалидирует истекшие сессии

## Bug Summary

При создании новой сессии через `DemoAuthProvider.createDemoSession()` или OAuth-провайдеры старые сессии пользователя не удаляются, что приводит к неограниченному росту таблицы `sessions` и прерывистым 401 ошибкам при использовании cookie со старой истекшей сессией.

## Root Cause

**Файл**: `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`  
**Строка**: 40  
**Уровень уверенности**: HIGH

Метод `createDemoSession()` вызывает `sessionService.createSession(demoUser.id)` без предварительного удаления существующих сессий пользователя. Метод `invalidateAllUserSessions(userId)` существует в `SessionService`, но никогда не вызывается при создании новой сессии.

```kotlin
// Проблемный код (DemoAuthProvider.kt:40)
val session = sessionService.createSession(demoUser.id)  // ❌ Старые сессии НЕ удаляются
```

**Та же проблема присутствует в**:
- `OAuthService.kt:62` - `handleCallback()` для Google OAuth
- `OAuthService.kt:99` - `handleAppleCallback()` для Apple OAuth

## Consilium Findings

### Architect (Code Tracer)
- **Root Cause Agreed**: ДА
- **Summary**: Проблема в отсутствии вызова `invalidateAllUserSessions()` перед созданием новой сессии в `DemoAuthProvider.createDemoSession()` (строка 40). Аналогичная проблема в `OAuthService.handleCallback()` и `handleAppleCallback()`. Архитектурная причина — нарушение DRY: логика создания сессий разбросана по нескольким провайдерам без единой политики управления сессиями.

### Stack Expert (Framework)
- **Root Cause Agreed**: ДА
- **Summary**: Spring Boot 3.2.2 + Exposed ORM работают корректно. `SessionCreationPolicy.STATELESS` в Spring Security означает, что приложение само управляет сессиями через таблицу `sessions`. Метод `cleanupExpiredSessions()` существует, но никогда не вызывается по расписанию. Нет конфигурации для автоматической очистки сессий.

### Consensus
**Все субагенты согласны**: Корневая причина — отсутствие инвалидации старых сессий при создании новой. Инфраструктура для исправления (`invalidateAllUserSessions()`) уже существует, но не используется.

## Reproduction Results

**Статус**: БАГ УСПЕШНО ВОСПРОИЗВЕДЁН

1. Вызов `POST /api/auth/demo` 5 раз без logout
2. В базе данных накопилось 6 сессий для одного пользователя
3. При установке `expires_at = '2020-01-01'` для одной из сессий и использовании её cookie — получена ошибка 401 "Session expired"
4. Другие 5 действительных сессий по-прежнему в базе, но пользователь получает 401

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt` | MODIFY | Добавить вызов `sessionService.invalidateAllUserSessions(demoUser.id)` перед созданием сессии |
| `server/src/main/kotlin/com/notebox/domain/auth/OAuthService.kt` | MODIFY | Добавить инвалидацию сессий в `handleCallback()` и `handleAppleCallback()` |

## Fix Plan

### Шаг 1: Исправить DemoAuthProvider.kt (Приоритет: HIGH)
**Файл**: `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`
**Действие**: Добавить вызов `sessionService.invalidateAllUserSessions(demoUser.id)` перед строкой 40

```kotlin
// ПЕРЕД (текущий код)
val session = sessionService.createSession(demoUser.id)

// ПОСЛЕ (исправленный код)
sessionService.invalidateAllUserSessions(demoUser.id)
val session = sessionService.createSession(demoUser.id)
```

### Шаг 2: Исправить OAuthService.kt (Приоритет: HIGH)
**Файл**: `server/src/main/kotlin/com/notebox/domain/auth/OAuthService.kt`
**Действие**: Добавить инвалидацию сессий перед созданием новых в обоих методах

В методе `handleCallback()` (около строки 62):
```kotlin
sessionService.invalidateAllUserSessions(user.id)
val session = sessionService.createSession(user.id)
```

В методе `handleAppleCallback()` (около строки 99):
```kotlin
sessionService.invalidateAllUserSessions(user.id)
val session = sessionService.createSession(user.id)
```

### Шаг 3: (Опционально) Добавить scheduled task для очистки истекших сессий
**Файл**: Создать `server/src/main/kotlin/com/notebox/config/ScheduledTasks.kt`
**Действие**: Добавить периодический вызов `sessionService.cleanupExpiredSessions()`

```kotlin
@Component
class ScheduledTasks(private val sessionService: SessionService) {
    @Scheduled(cron = "0 0 * * * *") // Каждый час
    fun cleanupExpiredSessions() {
        sessionService.cleanupExpiredSessions()
    }
}
```

## Testing Strategy

### Unit Tests
1. Проверить, что `DemoAuthProvider.createDemoSession()` удаляет старые сессии перед созданием новой
2. Проверить, что `OAuthService.handleCallback()` удаляет старые сессии
3. Проверить, что у пользователя остаётся только одна активная сессия после входа

### Integration Tests
1. Вызвать `POST /api/auth/demo` несколько раз
2. Проверить, что в таблице `sessions` остаётся только одна запись для пользователя
3. Убедиться, что пользователь НЕ получает 401 при использовании последней созданной сессии

### Manual Testing
1. Войти в демо-режим через браузер
2. Открыть второй браузер/incognito и войти снова
3. Проверить, что первая сессия инвалидирована (редирект на логин)
4. Проверить базу данных — должна быть только одна сессия

## Risk Assessment

### Потенциальные риски

1. **Принудительный logout активных сессий**
   - **Риск**: Пользователи с несколькими устройствами будут выходить из системы при входе с другого устройства
   - **Митигация**: Это ожидаемое поведение для приложения с политикой "одна сессия на пользователя"

2. **Race condition при одновременном входе**
   - **Риск**: Если пользователь входит одновременно с двух устройств, может возникнуть race condition
   - **Митигация**: `invalidateAllUserSessions()` работает транзакционно — один из входов "победит"

3. **Изменение поведения для существующих пользователей**
   - **Риск**: Пользователи с множественными сессиями внезапно потеряют все сессии кроме текущей
   - **Митигация**: Это исправление бага, а не изменение функциональности — такое поведение ожидалось изначально

### Низкий риск
- Исправление использует существующую функциональность (`invalidateAllUserSessions`)
- Не требует изменения схемы базы данных
- Не влияет на API контракты

---

**Дата диагностики**: 2026-05-25  
**Статус**: Готово к имплементации
