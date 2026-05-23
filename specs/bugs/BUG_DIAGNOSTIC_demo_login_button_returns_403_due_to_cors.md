# Диагностический отчёт: Demo login button returns 403 due to CORS

**Дата:** 2026-05-23  
**Severity:** HIGH  
**Статус:** ДИАГНОСТИРОВАН

---

## Краткое описание бага

При нажатии на кнопку "Войти в демо" на странице логина браузер отправляет CORS preflight запрос (OPTIONS) к `/api/auth/demo`, который Spring Security блокирует с ошибкой 403 "Invalid CORS request". POST запрос никогда не достигает сервера. Пользователи не могут войти в демо-режим через UI.

---

## Корневая причина

**Файл:** `docker-compose.yml`, строки 45-57  
**Вторичный файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`, строка 27

### Описание проблемы

После фикса критической уязвимости CORS (коммит `1133066`) конфигурация CORS была изменена с небезопасного `allowedOriginPatterns = listOf("*")` на whitelist из переменной окружения `cors.allowed-origins`. 

**Однако в `docker-compose.yml` не была добавлена переменная `CORS_ALLOWED_ORIGINS` для сервера.**

В результате:
1. Сервер использует значение по умолчанию из `application.yml`: `http://localhost:5173,http://localhost:3000`
2. Docker Compose создаёт nginx на случайном внешнем порту (например, `33851`)
3. Браузер отправляет запросы с Origin: `http://host.docker.internal:33851`
4. Origin не совпадает с whitelist → Spring Security возвращает 403 "Invalid CORS request"

### Доказательства

Из `.reproduction-results.json`:
```
OPTIONS /api/auth/demo с Origin header → HTTP 403 "Invalid CORS request"
POST /api/auth/demo с Origin header → HTTP 403 "Invalid CORS request"
POST /api/auth/demo БЕЗ Origin header → HTTP 200 OK (работает!)
```

Сообщение "Invalid CORS request" - стандартная ошибка Spring Security при несовпадении Origin с allowedOrigins.

---

## Выводы консилиума

### Architect (Code Tracer)
- **Согласен с корневой причиной:** Да
- **Дополнительно выявлено:** RateLimitFilter не пропускает OPTIONS запросы, что может усугублять проблему
- **Ключевой коммит:** `16d31f1` добавил rate limiting, `1133066` изменил CORS на whitelist

### Stack Expert (Spring Security)
- **Согласен с корневой причиной:** Да
- **Подтверждено:** CORS конфигурация в SecurityConfig.kt корректна, проблема в отсутствии переменной окружения
- **Анализ фильтров:** Filter chain правильно настроен после фикса `ef3fd89`

### Консенсус
Оба субагента согласны: проблема в несовпадении Origin из-за отсутствия `CORS_ALLOWED_ORIGINS` в docker-compose.yml.

---

## Результаты воспроизведения

**Статус:** ВОСПРОИЗВЕДЁН ✅

| Endpoint | Метод | Origin Header | Результат |
|----------|-------|---------------|-----------|
| `/api/auth/demo` | OPTIONS | Есть | 403 Invalid CORS request |
| `/api/auth/demo` | POST | Есть | 403 Invalid CORS request |
| `/api/auth/demo` | POST | Нет | 200 OK |
| `/api/auth/login` | OPTIONS | Есть | 403 Invalid CORS request |

Баг затрагивает ВСЕ API endpoints, не только `/api/auth/demo`.

---

## Затронутые файлы

| Файл | Действие | Описание |
|------|----------|----------|
| `docker-compose.yml` | MODIFY | Добавить CORS_ALLOWED_ORIGINS в environment сервера |
| `.env.example` | VERIFY | Проверить что CORS_ALLOWED_ORIGINS документирован (уже есть) |

---

## План исправления

### Шаг 1: Добавить CORS_ALLOWED_ORIGINS в docker-compose.yml

В секции `server.environment` добавить:
```yaml
CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:5173,http://localhost:3000}
```

### Шаг 2: Для динамических портов использовать паттерн

Поскольку nginx использует `"0:80"` (случайный порт), нужен более гибкий подход:

**Вариант A (рекомендуется для dev):** Изменить SecurityConfig.kt для поддержки паттернов:
```kotlin
configuration.allowedOriginPatterns = allowedOrigins.split(",").map { it.trim() }
```
И в `.env.example`:
```
CORS_ALLOWED_ORIGINS=http://localhost:*,http://host.docker.internal:*
```

**Вариант B (для production):** Зафиксировать порт nginx в docker-compose.yml и добавить его в whitelist.

### Шаг 3: Тестирование

1. Запустить `docker-compose up`
2. Открыть приложение в браузере
3. Нажать "Войти в демо"
4. Проверить что вход проходит успешно

---

## Стратегия тестирования

### Автоматические тесты
1. Добавить интеграционный тест для CORS preflight на `/api/auth/demo`
2. Тест должен отправлять OPTIONS запрос с Origin header и проверять 200 ответ с CORS headers

### Ручное тестирование
1. `docker-compose down && docker-compose up --build`
2. Открыть DevTools → Network
3. Нажать "Войти в демо"
4. Проверить что OPTIONS возвращает 200 с `Access-Control-Allow-Origin`
5. Проверить что POST возвращает 200 с данными пользователя

### E2E тесты
1. Использовать Playwright для проверки полного flow демо-логина
2. Проверить отсутствие ошибок CORS в консоли браузера

---

## Оценка рисков

### Риски исправления

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Слишком широкий CORS паттерн | Средняя | Высокое | Использовать конкретные паттерны вместо `*` |
| Поломка существующих интеграций | Низкая | Среднее | Проверить все origins перед деплоем |
| Регрессия безопасности | Низкая | Высокое | Code review, не использовать wildcard `*` |

### Что может сломаться
- Если использовать слишком ограничивающий whitelist, могут перестать работать другие окружения
- Если использовать `*`, вернётся уязвимость из коммита `1133066`

### Рекомендация
Использовать `allowedOriginPatterns` с паттернами `http://localhost:*` и `http://host.docker.internal:*` для dev-окружения, и конкретные домены для production.

---

## История изменений

| Коммит | Дата | Описание | Влияние на баг |
|--------|------|----------|----------------|
| `1133066` | 2026-05-20 | Фикс CORS wildcard уязвимости | **ВВЁЛ БАГ** - whitelist без обновления docker-compose |
| `ef3fd89` | 2026-05-20 | Исправление порядка фильтров | Не влияет |
| `16d31f1` | 2026-05-20 | Добавление rate limiting | Потенциально усугубляет |

---

## Вывод

Баг вызван неполным фиксом уязвимости CORS: переменная `CORS_ALLOWED_ORIGINS` была добавлена в конфигурацию Spring, но не была передана в docker-compose.yml. В результате сервер использует hardcoded localhost origins, которые не совпадают с реальным URL при запуске через Docker.

**Приоритет исправления:** ВЫСОКИЙ  
**Оценка времени:** 30 минут  
**Сложность:** Низкая
