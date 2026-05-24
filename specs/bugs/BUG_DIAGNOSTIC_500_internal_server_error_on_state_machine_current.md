# Диагностический отчёт: 500 Internal Server Error на эндпоинте state-machine current-stage

**Дата:** 2026-05-24  
**Серьёзность:** HIGH  
**Статус:** ДИАГНОСТИКА ЗАВЕРШЕНА  

---

## Краткое описание бага

API эндпоинт `/api/v1/state-machine/tasks/{id}/current-stage` возвращает HTTP 500 Internal Server Error для всех запросов вместо корректного ответа или 404 Not Found.

---

## Корневая причина

**Первичная проблема:** Эндпоинт `/api/v1/state-machine/tasks/{id}/current-stage` **НЕ СУЩЕСТВУЕТ** в кодовой базе.

**Вторичная проблема:** Spring Framework возвращает 500 вместо 404 из-за отсутствия обработчика `NoHandlerFoundException`.

### Точное местоположение проблемы

**Файл:** `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt`  
**Строка:** 111-118

```kotlin
@ExceptionHandler(Exception::class)
fun handleGenericException(ex: Exception): ResponseEntity<ApiResponse<Nothing>> {
    logger.error("Unexpected error occurred", ex)
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(errorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
}
```

**Проблема:** Catch-all обработчик перехватывает `NoHandlerFoundException` от Spring DispatcherServlet и возвращает 500 вместо 404.

---

## Результаты Consilium анализа

### Субагент 1: Архитектор (Code Tracer)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
1. Эндпоинт `/api/v1/state-machine/tasks/{id}/current-stage` полностью отсутствует
2. Нет контроллера `StateMachineController.kt`
3. Нет сервиса, репозитория или моделей данных для state-machine
4. Нет схемы БД для таблиц tasks, stages, state_machines
5. Существующие контроллеры используют `/api/`, а не `/api/v1/` — несоответствие версионирования
6. GlobalExceptionHandler ловит все исключения и возвращает 500

**Проанализированный Data Flow:**
```
GET /api/v1/state-machine/tasks/1/current-stage
    ↓
RateLimitFilter → проходит
    ↓
SessionAuthenticationFilter → проходит (пользователь авторизован)
    ↓
Spring DispatcherServlet → НЕТ МАРШРУТА → NoHandlerFoundException
    ↓
GlobalExceptionHandler.handleGenericException() → HTTP 500
```

### Субагент 2: Stack Expert (Технологический стек)

**Согласие с корневой причиной:** ДА

**Ключевые находки:**
1. Spring Boot 3.2.2, Kotlin 1.9.22 — конфигурация корректна
2. PostgreSQL, MinIO — зависимости работают правильно
3. docker-compose.yml настроен корректно с healthcheck
4. Environment variables в .env.example настроены правильно
5. CORS и Security — конфигурация корректна
6. **Проблема:** Отсутствует обработчик `NoHandlerFoundException`

**Конфигурационные проверки:**
- application.yml — OK
- docker-compose.yml — OK
- build.gradle.kts — OK (нет конфликтов зависимостей)
- SecurityConfig.kt — OK (корректная авторизация)

### Консенсус субагентов

| Аспект | Архитектор | Stack Expert | Согласие |
|--------|------------|--------------|----------|
| Эндпоинт не существует | ДА | ДА | ✅ |
| Проблема в GlobalExceptionHandler | ДА | ДА | ✅ |
| Нет обработчика NoHandlerFoundException | ДА | ДА | ✅ |
| Конфигурация корректна | ДА | ДА | ✅ |
| Зависимости без конфликтов | ДА | ДА | ✅ |

**Разногласия:** Отсутствуют. Оба субагента полностью согласны.

---

## Результаты воспроизведения

**Статус:** ✅ БАГ УСПЕШНО ВОСПРОИЗВЕДЁН

**Протестированные запросы:**
| Task ID | URL | Результат |
|---------|-----|-----------|
| 1 | `/api/v1/state-machine/tasks/1/current-stage` | HTTP 500 |
| 2 | `/api/v1/state-machine/tasks/2/current-stage` | HTTP 500 |
| 3 | `/api/v1/state-machine/tasks/3/current-stage` | HTTP 500 |
| 5 | `/api/v1/state-machine/tasks/5/current-stage` | HTTP 500 |
| 10 | `/api/v1/state-machine/tasks/10/current-stage` | HTTP 500 |

**Паттерн:** Все запросы возвращают одинаковую ошибку 500, что подтверждает проблему маршрутизации (не проблему данных).

---

## Затронутые файлы

### Файлы для модификации

1. **`server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt`** (строка 111)
   - Добавить обработчик для `NoHandlerFoundException`
   - Возвращать HTTP 404 для несуществующих маршрутов

### Файлы для создания (опционально, если требуется полная реализация)

1. `server/src/main/kotlin/com/notebox/domain/statemachine/StateMachineController.kt`
2. `server/src/main/kotlin/com/notebox/domain/statemachine/StateMachineService.kt`
3. `server/src/main/kotlin/com/notebox/domain/statemachine/StateMachineRepository.kt`
4. `server/src/main/kotlin/com/notebox/domain/statemachine/Task.kt`
5. `server/src/main/kotlin/com/notebox/domain/statemachine/TasksTable.kt`

---

## План исправления

### Вариант A: Минимальное исправление (рекомендуется)

Добавить обработчик `NoHandlerFoundException` в GlobalExceptionHandler для возврата корректного HTTP 404.

**Шаг 1:** Модифицировать `GlobalExceptionHandler.kt`

```kotlin
import org.springframework.web.servlet.NoHandlerFoundException

@ExceptionHandler(NoHandlerFoundException::class)
fun handleNoHandlerFoundException(ex: NoHandlerFoundException): ResponseEntity<ApiResponse<Nothing>> {
    logger.warn("Route not found: {} {}", ex.httpMethod, ex.requestURL)
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(errorResponse("NOT_FOUND", "Endpoint ${ex.requestURL} not found"))
}
```

**Шаг 2:** Добавить конфигурацию Spring для выброса исключения при отсутствии обработчика

В `application.yml`:
```yaml
spring:
  mvc:
    throw-exception-if-no-handler-found: true
  web:
    resources:
      add-mappings: false
```

### Вариант B: Полная реализация функциональности

Если фича state-machine требуется:
1. Создать контроллер `StateMachineController.kt` с маршрутом `/api/v1/state-machine/**`
2. Создать сервисный слой `StateMachineService.kt`
3. Создать репозиторий и модели данных
4. Создать схему БД для таблиц tasks, stages, state_machines
5. Обновить `DatabaseConfig.kt` для создания новых таблиц

---

## Стратегия тестирования

### Тесты для Варианта A (минимальное исправление)

1. **Тест 404 для несуществующего маршрута:**
   ```bash
   curl -X GET http://localhost:8080/api/v1/nonexistent
   # Ожидается: HTTP 404 с JSON {"error": {"code": "NOT_FOUND", ...}}
   ```

2. **Тест 404 для state-machine:**
   ```bash
   curl -X GET http://localhost:8080/api/v1/state-machine/tasks/1/current-stage
   # Ожидается: HTTP 404 (а не 500)
   ```

3. **Регрессионный тест существующих эндпоинтов:**
   ```bash
   curl -X GET http://localhost:8080/api/config
   # Ожидается: HTTP 200 (работает как раньше)
   ```

### Тесты для Варианта B (полная реализация)

1. Тест GET `/api/v1/state-machine/tasks/{id}/current-stage` — HTTP 200 для существующих задач
2. Тест GET `/api/v1/state-machine/tasks/{id}/current-stage` — HTTP 404 для несуществующих задач
3. Интеграционные тесты с БД

---

## Оценка рисков

### Риски при исправлении

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Изменение поведения для других несуществующих маршрутов | Высокая | Низкое | Это желаемое поведение — 404 вместо 500 |
| Поломка существующих эндпоинтов | Низкая | Высокое | Регрессионное тестирование |
| Несовместимость с фронтендом | Низкая | Среднее | Проверить обработку 404 на фронтенде |

### Потенциальные побочные эффекты

- Другие несуществующие маршруты также начнут возвращать 404 вместо 500 (желаемое поведение)
- Логирование изменится с `error` на `warn` для несуществующих маршрутов

---

## Заключение

Баг вызван **отсутствием эндпоинта** `/api/v1/state-machine/tasks/{id}/current-stage` в сочетании с **недостаточной обработкой ошибок маршрутизации** в GlobalExceptionHandler.

**Рекомендация:** Начать с минимального исправления (Вариант A) — добавить обработчик `NoHandlerFoundException`. Это исправит возврат некорректного статус-кода 500 для несуществующих маршрутов. Полная реализация функциональности state-machine (Вариант B) требует отдельного анализа требований.

---

**Отчёт сгенерирован:** 2026-05-24  
**Инструмент:** Claude Code (Consilium Diagnostic)
