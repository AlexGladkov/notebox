# Диагностический отчёт: CORS Preflight 403 блокирует POST/PUT/DELETE

**Дата:** 2026-05-23  
**Статус:** ✅ Диагностика завершена  
**Серьёзность:** 🔴 ВЫСОКАЯ

---

## Bug Summary

Spring Security блокирует OPTIONS preflight запросы с ответом 403 Forbidden и сообщением "Invalid CORS request", что полностью блокирует все POST/PUT/DELETE операции из браузера.

---

## Root Cause

**Файл:** `docker-compose.yml:59`  
**Строка:** `CORS_ALLOWED_ORIGINS: "${CORS_ALLOWED_ORIGINS},http://host.docker.internal:33825"`

### Описание проблемы

Порт `33825` захардкожен в docker-compose.yml, но E2E тесты используют динамический порт (в данном случае `33853`). Когда браузер отправляет OPTIONS preflight запрос с заголовком `Origin: http://host.docker.internal:33853`, Spring Security проверяет его против списка разрешённых origins и возвращает 403 "Invalid CORS request", так как порт 33853 не в списке.

### Дополнительная проблема

**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt:80-104`

`SessionAuthenticationFilter` не пропускает OPTIONS запросы. Хотя это не является прямой причиной текущего бага (403 возвращается до достижения этого фильтра), это может вызвать проблемы даже при исправленной CORS конфигурации, если OPTIONS запросы достигнут этого фильтра без сессионной cookie.

### Цепочка ошибки

```
1. Browser (port 33853) → POST /api/auth/demo
2. Browser auto-sends → OPTIONS /api/auth/demo
   ├─ Origin: http://host.docker.internal:33853
3. Spring Security CORS Filter
   ├─ allowedOrigins = [..., http://host.docker.internal:33825]
   ├─ Checks: "33853" in list? → NO
4. CORS validation fails → 403 "Invalid CORS request"
5. Browser blocks actual request
6. User sees: "Не удалось войти в демо-режим"
```

---

## Consilium Findings

### Architect (Code Tracer)

- **Согласие с root cause:** ✅ Да
- **Summary:** Идентифицировал несоответствие портов в CORS конфигурации (33825 vs 33853). Подтвердил, что проблема в docker-compose.yml:59. Отметил, что curl работает, потому что не использует CORS preflight.

### Stack Expert (Spring Security)

- **Согласие с root cause:** ✅ Частично
- **Summary:** Дополнительно выявил проблему с порядком фильтров и отсутствием проверки OPTIONS в SessionAuthenticationFilter. Отметил, что конкатенация CORS origins в docker-compose.yml может привести к невалидному списку (начинающемуся с запятой).

### Консенсус

- **Согласие:** ✅ Оба субагента согласны, что проблема в CORS конфигурации
- **Разногласия:** Stack Expert указал на дополнительные потенциальные проблемы с фильтрами, которые стоит исправить превентивно

---

## Reproduction Results

**Воспроизведён:** ✅ Да

### Наблюдаемое поведение

| Запрос | Ожидается | Фактически |
|--------|-----------|------------|
| OPTIONS preflight | 200/204 + CORS headers | 403 "Invalid CORS request" |
| POST из браузера | 200 OK | Заблокирован |
| POST из curl | 200 OK | ✅ 200 OK |
| GET запросы | 200 OK | ✅ 200 OK |

### Затронутые операции

- ❌ `POST /api/auth/demo` — Демо-логин
- ❌ `POST /api/notes` — Создание заметки
- ❌ `PUT /api/notes/{id}` — Обновление заметки
- ❌ `DELETE /api/notes/{id}` — Удаление заметки
- ❌ `POST /api/tags` — Создание тега
- ❌ Все другие write операции из браузера

---

## Affected Files

1. `docker-compose.yml` — Основной файл для исправления
2. `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` — Опционально: добавить проверку OPTIONS

---

## Fix Plan

### Шаг 1: Исправить CORS origins в docker-compose.yml

**Файл:** `docker-compose.yml:59`

**Текущий код:**
```yaml
CORS_ALLOWED_ORIGINS: "${CORS_ALLOWED_ORIGINS},http://host.docker.internal:33825"
```

**Исправленный код (вариант A — использовать test origin из переменной):**
```yaml
CORS_ALLOWED_ORIGINS: "${CORS_ALLOWED_ORIGINS:-http://localhost:5173,http://localhost:3000},${TEST_ORIGIN:-}"
```

**Исправленный код (вариант B — добавить wildcard pattern в SecurityConfig):**
Реализовать `setAllowedOriginPatterns` вместо `setAllowedOrigins` для поддержки wildcard `http://host.docker.internal:*`

**Рекомендация:** Вариант A более безопасен, так как не открывает wildcard в production.

### Шаг 2 (опционально): Добавить проверку OPTIONS в SessionAuthenticationFilter

**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt:80-84`

**Добавить в начало doFilterInternal:**
```kotlin
// Пропускаем OPTIONS preflight запросы
if (request.method == "OPTIONS") {
    filterChain.doFilter(request, response)
    return
}
```

### Шаг 3: Протестировать исправление

1. Запустить E2E тесты с динамическим портом
2. Проверить, что OPTIONS preflight возвращает 200/204
3. Проверить, что POST/PUT/DELETE работают из браузера
4. Проверить, что GET запросы продолжают работать

---

## Testing Strategy

### Автоматические тесты

1. **Unit тест для CORS:** Проверить, что `corsConfigurationSource()` возвращает конфигурацию с правильными origins
2. **Integration тест:** Отправить OPTIONS preflight и проверить ответ 200/204 с CORS заголовками

### Ручное тестирование

1. Запустить приложение через docker-compose
2. Открыть в браузере
3. Нажать "Войти в демо"
4. Убедиться, что вход успешен
5. Создать заметку
6. Убедиться, что заметка создана

### E2E тест

Playwright тест, который:
1. Открывает приложение
2. Нажимает "Войти в демо"
3. Проверяет, что вход успешен (нет ошибки 403)
4. Создаёт заметку
5. Проверяет, что заметка появилась

---

## Risk Assessment

### Риски исправления

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Нарушение CORS в production | Низкая | Высокое | Не использовать wildcard; только добавить test origin в TEST_ORIGIN переменную |
| Пропуск OPTIONS ломает rate limiting | Низкая | Низкое | OPTIONS запросы обычно не нуждаются в rate limiting |
| Регрессия в аутентификации | Низкая | Высокое | Проверить, что POST/PUT/DELETE продолжают требовать аутентификацию после preflight |

### Что может сломаться

1. **Если добавить wildcard:** Потенциальная уязвимость CORS в production
2. **Если неправильно настроить origins:** Другие клиенты могут потерять доступ

### Рекомендации

- Использовать переменную окружения `TEST_ORIGIN` для тестовых сред
- Не коммитить конкретные порты в docker-compose.yml
- Добавить проверку OPTIONS в SessionAuthenticationFilter как защитную меру

---

## Conclusion

Баг имеет простое исправление: обновить CORS origins в docker-compose.yml чтобы включить динамический тестовый origin. Дополнительно рекомендуется добавить проверку OPTIONS в SessionAuthenticationFilter для предотвращения подобных проблем в будущем.

---

**Отчёт подготовлен:** Consilium Analysis (Architect + Stack Expert)  
**Дата:** 2026-05-23
