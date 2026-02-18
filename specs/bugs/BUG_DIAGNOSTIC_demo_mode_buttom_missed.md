# Диагностический отчёт: Кнопка Demo User отсутствует после "Войти заново"

## Bug Summary
После нажатия "Войти заново" в модальном окне истёкшей сессии, на странице логина отображаются только кнопки Google и Apple OAuth, а кнопка "Войти в демо" отсутствует.

## Root Cause
**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt:67-82`

Фильтр `SessionAuthenticationFilter` проверяет валидность сессии для **всех** запросов, включая публичные эндпоинты. Когда пользователь с истёкшей сессионной cookie переходит на `/login`, запрос на `/api/config` блокируется фильтром с ошибкой 401, хотя этот эндпоинт объявлен как `permitAll()` в конфигурации безопасности.

**Проблемный код:**
```kotlin
override fun doFilterInternal(
    request: HttpServletRequest,
    response: HttpServletResponse,
    filterChain: jakarta.servlet.FilterChain
) {
    val sessionId = getSessionIdFromCookies(request)

    // ПРОБЛЕМА: Проверка сессии происходит ДО проверки permitAll()
    if (sessionId != null && !sessionService.validateSession(sessionId)) {
        response.status = HttpServletResponse.SC_UNAUTHORIZED
        response.contentType = "application/json"
        response.writer.write("""{"error":{"code":"SESSION_EXPIRED","message":"Session expired"}}""")
        return  // Запрос блокируется, даже если эндпоинт публичный
    }

    filterChain.doFilter(request, response)
}
```

## Analysis

### Поток данных при возникновении бага:

1. **Пользователь работает в приложении** → сессия истекает
2. **API возвращает 401** → `apiClient` устанавливает `sessionExpired = true`
3. **Появляется `SessionExpiredModal`** → пользователь нажимает "Войти заново"
4. **`SessionExpiredModal.vue:33-36`** вызывает:
   ```typescript
   authStore.setSessionExpired(false);
   router.push('/login');
   ```
5. **`LoginView.vue` монтируется** и в `onMounted` (строка 36-49) вызывает:
   ```typescript
   const config = await authService.getConfig();
   demoModeEnabled.value = config.demoModeEnabled;
   ```
6. **`authService.getConfig()`** → запрос `GET /api/config` **с истёкшей cookie**
7. **`SessionAuthenticationFilter`** перехватывает запрос, проверяет сессию, видит что она невалидна → возвращает 401
8. **`getConfig()` выбрасывает исключение** → `demoModeEnabled` остаётся `false`
9. **Кнопка DemoButton не отображается** из-за `v-if="demoModeEnabled"`

### Почему баг не проявляется при первом посещении:

При первом посещении `/login` у пользователя нет сессионной cookie, поэтому `getSessionIdFromCookies()` возвращает `null`, и фильтр пропускает запрос.

### Почему баг не проявляется при обычном выходе:

При logout cookie сессии удаляется, поэтому при следующем посещении `/login` проблема не возникает.

## Affected Files

| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` | Основное исправление: пропускать публичные пути в фильтре |

## Fix Plan

### Вариант 1 (Рекомендуемый): Исправление на серверной стороне

Модифицировать `SessionAuthenticationFilter`, чтобы он пропускал публичные эндпоинты без проверки сессии:

```kotlin
@Component
class SessionAuthenticationFilter(
    private val sessionService: SessionService
) : OncePerRequestFilter() {

    companion object {
        private const val SESSION_COOKIE_NAME = "SESSION_ID"
        // Список публичных путей, которые не требуют проверки сессии
        private val PUBLIC_PATHS = listOf("/api/auth/", "/api/config")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: jakarta.servlet.FilterChain
    ) {
        val requestPath = request.requestURI

        // Пропускаем публичные эндпоинты без проверки сессии
        if (PUBLIC_PATHS.any { requestPath.startsWith(it) }) {
            filterChain.doFilter(request, response)
            return
        }

        val sessionId = getSessionIdFromCookies(request)

        if (sessionId != null && !sessionService.validateSession(sessionId)) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"SESSION_EXPIRED","message":"Session expired"}}""")
            return
        }

        filterChain.doFilter(request, response)
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
```

### Вариант 2 (Альтернативный): Исправление на клиентской стороне

Очищать сессионную cookie в `SessionExpiredModal.vue` перед переходом на `/login`:

```typescript
function handleLogin() {
  // Удаляем сессионную cookie
  document.cookie = 'SESSION_ID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  authStore.setSessionExpired(false);
  router.push('/login');
}
```

**Примечание:** Вариант 2 менее надёжен, так как:
- Зависит от соответствия имени cookie на клиенте и сервере
- Cookie может иметь флаг `HttpOnly`, который не позволит JavaScript её удалить

## Testing Strategy

### Ручное тестирование:

1. **Подготовка:**
   - Включить demo mode в конфигурации сервера
   - Войти в приложение (любым способом)

2. **Воспроизведение бага (до исправления):**
   - Дождаться истечения сессии (или принудительно удалить сессию в базе)
   - Выполнить любое действие, чтобы появилось модальное окно "Сессия истекла"
   - Нажать "Войти заново"
   - **Ожидание (баг):** Кнопка "Войти в демо" отсутствует
   - **Ожидание (после исправления):** Кнопка "Войти в демо" отображается

3. **Регрессионное тестирование:**
   - Проверить, что OAuth кнопки работают корректно
   - Проверить, что демо-логин работает после исправления
   - Проверить, что защищённые эндпоинты по-прежнему требуют аутентификации

### Автоматические тесты:

Добавить интеграционный тест:
```kotlin
@Test
fun `public endpoints should work with invalid session cookie`() {
    // Given: запрос с невалидной сессионной cookie
    val invalidSessionCookie = Cookie("SESSION_ID", "invalid-session-id")

    // When: запрос на /api/config
    mockMvc.perform(get("/api/config").cookie(invalidSessionCookie))
        // Then: должен вернуть 200 OK с конфигурацией
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.data.demoModeEnabled").exists())
}
```

## Risk Assessment

### Риски исправления:

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Случайное разрешение доступа к защищённым эндпоинтам | Низкий | Список публичных путей строго ограничен и синхронизирован с `authorizeHttpRequests` |
| Регрессия в существующей функциональности авторизации | Низкий | Покрыть тестами основные сценарии авторизации |

### Что может сломаться:

- Ничего критичного, так как изменение затрагивает только обработку публичных эндпоинтов
- Необходимо убедиться, что список `PUBLIC_PATHS` синхронизирован с `permitAll()` в `securityFilterChain`

### Рекомендации:

1. Реализовать Вариант 1 (серверная сторона) как основное решение
2. Добавить комментарий в код о необходимости синхронизации `PUBLIC_PATHS` с `authorizeHttpRequests`
3. Рассмотреть возможность рефакторинга для автоматической синхронизации списков

---

**Дата диагностики:** 2026-02-18
**Критичность:** HIGH
**Затронутая функциональность:** Демо-режим, страница входа
