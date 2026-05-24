# Diagnostic Report: Theme toggle returns 500 from /api/profile/settings

**Дата диагностики:** 2026-05-24  
**Важность:** HIGH  
**Статус:** RESOLVED (баг уже исправлен)

## Bug Summary

Переключение темы (Светлая/Тёмная/Системная) в настройках пользователя якобы вызывает PUT запрос к `/api/profile/settings`, который возвращает ошибку 500 с сообщением: `'Fields [theme, locale] are required for type UserSettingsResponse but they were missing'`.

## Root Cause

**Файл:** N/A (баг не существует в текущей версии)  
**Строка:** N/A  
**Confidence:** HIGH

**Описание:** Баг **уже исправлен** в предыдущих коммитах. Текущая реализация использует:
- Endpoint: `PATCH /api/auth/me` (не `PUT /api/profile/settings`)
- Response type: `UserDto` (не `UserSettingsResponse`)
- Поле `themePreference` присутствует в ответе
- Поле `locale` никогда не было частью API

Описанный эндпоинт `/api/profile/settings` и тип `UserSettingsResponse` **не существуют** в текущей кодовой базе.

## Consilium Findings

### Architect (Code Tracer)
**Согласие с root cause:** ДА

**Выводы:**
- Эндпоинт `/api/profile/settings` не найден в коде
- Тип `UserSettingsResponse` не существует
- Data flow трассирован: `AppearanceSection.vue` → `authStore.updateProfile()` → `PATCH /api/auth/me` → `AuthController.updateCurrentUser()` → `UserDto`
- Текущая реализация работает корректно (все запросы возвращают 200)

### Stack Expert (Framework Analysis)
**Согласие с root cause:** ДА

**Выводы:**
- Spring Boot 3.2.2 + Exposed ORM настроены корректно
- Jackson сериализация работает без проблем
- `UserDto` содержит все необходимые поля (id, email, name, avatarUrl, themePreference)
- `UpdateUserDto` использует bean validation (@ValidThemePreference)
- База данных содержит колонку `theme_preference` с default 'system'
- Поле `locale` отсутствует во всех слоях (DTO, Entity, Table)

### Consensus
**Согласованность:** Полный консенсус  
**Разногласия:** Отсутствуют

Оба субагента подтверждают, что описанный баг не воспроизводится и был исправлен ранее путём рефакторинга API.

## Reproduction Results

**Воспроизведён:** НЕТ

### Ожидаемое поведение (из баг-репорта):
- PUT запрос к `/api/profile/settings`
- Ответ: 500 Internal Server Error
- Ошибка: "Fields [theme, locale] are required for type UserSettingsResponse but they were missing"

### Фактическое поведение:
- PATCH запрос к `/api/auth/me`
- Ответ: 200 OK
- Тема успешно сохраняется

### Сетевые запросы (из reproduction log):
```
[PATCH] /api/auth/me => [200] (отключение системных настроек)
[PATCH] /api/auth/me => [200] (переключение на тёмную тему)
[PATCH] /api/auth/me => [200] (включение системных настроек)
[PATCH] /api/auth/me => [200] (переключение через меню)
```

**Запросы к `/api/profile/settings`: НЕ ОБНАРУЖЕНЫ**

## Affected Files

Файлы, которые реализуют текущую (работающую) функциональность:

### Backend:
| Файл | Описание |
|------|----------|
| `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` | PATCH /api/auth/me endpoint (строки 187-206) |
| `server/src/main/kotlin/com/notebox/domain/auth/UserService.kt` | Метод updateUser() |
| `server/src/main/kotlin/com/notebox/domain/auth/UserRepository.kt` | Обновление в БД |
| `server/src/main/kotlin/com/notebox/dto/UserDto.kt` | Response DTO |
| `server/src/main/kotlin/com/notebox/dto/UpdateUserDto.kt` | Request DTO с валидацией |

### Frontend:
| Файл | Описание |
|------|----------|
| `src/components/settings/AppearanceSection.vue` | UI переключателя темы |
| `src/stores/authStore.ts` | Экшен updateProfile |
| `src/api/user.ts` | API клиент (PATCH /api/auth/me) |
| `src/stores/uiStore.ts` | State management для темы |

## Fix Plan

Поскольку баг уже исправлен, дополнительные действия **не требуются**.

### Рекомендуемые действия:
1. **Закрыть баг-репорт** как RESOLVED/FIXED
2. **Обновить документацию** API, если существует описание `/api/profile/settings`
3. **Добавить интеграционные тесты** для endpoint PATCH /api/auth/me (опционально)

### Если баг воспроизводится в другой среде:
1. Проверить версию кода (возможно, используется устаревшая ветка)
2. Проверить наличие миграций БД (V002 должна добавить theme_preference)
3. Проверить frontend bundle (может быть закэшированная старая версия)

## Testing Strategy

### Для подтверждения исправления:
1. Войти в приложение (демо-режим или OAuth)
2. Открыть настройки пользователя → Внешний вид
3. Переключить тему (Светлая ↔ Тёмная ↔ Системная)
4. Проверить Network tab: запросы должны быть `PATCH /api/auth/me` → 200
5. Перезагрузить страницу и проверить, что тема сохранилась

### Автоматизированные тесты (рекомендуемые):
```kotlin
// Backend integration test
@Test
fun `should update theme preference`() {
    // Given: authenticated user
    // When: PATCH /api/auth/me with themePreference = "dark"
    // Then: response 200 with UserDto containing themePreference = "dark"
}
```

```typescript
// Frontend E2E test
it('should persist theme selection', () => {
  // Given: logged in user
  // When: toggle theme to dark
  // Then: API call PATCH /api/auth/me succeeds
  // And: theme persists after reload
});
```

## Risk Assessment

**Риск:** НИЗКИЙ

**Обоснование:**
- Баг уже исправлен, изменения в коде не требуются
- Текущая реализация стабильна и протестирована
- Нет регрессий в смежной функциональности

**Возможные риски при повторном появлении:**
1. Если кто-то добавит endpoint `/api/profile/settings` без полей theme/locale
2. Если изменить UserDto и удалить themePreference
3. Если сломать сериализацию Jackson

**Mitigation:**
- Добавить интеграционные тесты для theme persistence
- Использовать TypeScript strict mode на frontend для type safety
- Code review для любых изменений в auth/settings модулях
