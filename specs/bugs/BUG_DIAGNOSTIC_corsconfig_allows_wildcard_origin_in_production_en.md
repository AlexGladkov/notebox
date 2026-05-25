# Диагностический отчёт: CorsConfig разрешает wildcard origin в production

## Bug Summary

CORS-конфигурация в `SecurityConfig.kt` безусловно добавляет паттерн `http://host.docker.internal:*` на строке 61, что позволяет любому приложению на произвольном порту host.docker.internal выполнять аутентифицированные кросс-доменные запросы к API, создавая вектор для CSRF-атак в production-окружении.

---

## Root Cause

**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`  
**Строка:** 61  
**Метод:** `corsConfigurationSource()`

```kotlin
// Добавляем host.docker.internal для тестирования (любой порт)
origins.add("http://host.docker.internal:*")  // ← УЯЗВИМОСТЬ
```

**Причина:** Строка 61 добавляет wildcard-паттерн `http://host.docker.internal:*` без какой-либо проверки активного Spring-профиля. Это означает, что паттерн применяется во ВСЕХ окружениях: dev, test и **production**.

**Регрессия:** Этот код был добавлен в коммите `8202101` ("fix: разрешить CORS для host.docker.internal во время E2E тестирования"), который частично отменил исправление безопасности из коммита `1133066` ("fix: устранение критической уязвимости CORS wildcard").

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с root cause:** ✅ Да

**Ключевые находки:**
- Root cause точно определён: строка 61 в `SecurityConfig.kt`
- Прослежена цепочка регрессии: коммит `8202101` отменил часть исправления из `1133066`
- Выявлено отсутствие архитектурных паттернов для разделения окружений:
  - Нет `@Profile` аннотаций
  - Нет файлов `application-prod.yml` / `application-dev.yml`
  - Нет инъекции `Environment` для проверки профиля
- Data flow: wildcard origin добавляется при инициализации bean'а и применяется ко всем запросам

### Stack Expert (Kotlin/Spring)

**Согласие с root cause:** ✅ Да

**Ключевые находки:**
- Spring Boot 3.2.2 с Spring Security 6.x корректно реализован
- Проблема не во фреймворке, а в конфигурации приложения
- `allowedOriginPatterns` интерпретирует `*` как regex-wildcard
- Отсутствует `application-prod.yml` для production-конфигурации
- В `.env.production` не указан `CORS_ALLOWED_ORIGINS`
- Dockerfile не устанавливает `SPRING_PROFILES_ACTIVE=prod`
- docker-compose.yml использует значения по умолчанию без production-ограничений

### Consensus

**Согласованность:** ✅ Полный консенсус

Оба субагента согласны по всем ключевым пунктам:
1. Root cause: строка 61 в `SecurityConfig.kt`
2. Проблема: безусловное добавление `http://host.docker.internal:*`
3. Причина: отсутствие механизма разделения окружений (Spring profiles)
4. Рекомендация: добавить проверку профиля и создать profile-specific конфигурацию

---

## Reproduction Results

**Статус:** ✅ Успешно воспроизведено

**Проведённые тесты:**
1. CORS preflight с `Origin: http://host.docker.internal:9999` → **200 OK**
2. Аутентифицированный запрос к `/api/notes` с wildcard origin → **200 OK + данные (20580 байт)**
3. Проверка портов 1234, 5555, 8888, 12345 → **Все разрешены**
4. Контрольный тест с `Origin: http://evil.com` → **403 Forbidden** (CORS работает для внешних origins)

**Вектор атаки:**
- Злоумышленник запускает приложение на произвольном порту `host.docker.internal`
- Отправляет CORS-запрос с credentials к NoteBox API
- Получает доступ к данным пользователя через его сессию

---

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` | Modify | Добавить проверку профиля на строке 61 |
| `server/src/main/resources/application-prod.yml` | Create | Создать production-конфигурацию без wildcard origins |
| `.env.example` | Modify | Добавить комментарий о production-настройках |

---

## Fix Plan

### Шаг 1: Добавить проверку профиля в SecurityConfig.kt

**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`

Добавить инъекцию профиля и условное добавление тестовых origins:

```kotlin
@Value("\${spring.profiles.active:dev}")
private lateinit var activeProfile: String

// В методе corsConfigurationSource():
// Добавляем host.docker.internal только для dev/test окружений
if (activeProfile != "prod" && activeProfile != "production") {
    origins.add("http://host.docker.internal:*")
}
```

### Шаг 2: Создать application-prod.yml (опционально)

**Файл:** `server/src/main/resources/application-prod.yml`

```yaml
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:https://swarmhost.tech/notebox}
```

### Шаг 3: Обновить комментарий в .env.example

Добавить пояснение о различии настроек для dev и production.

---

## Testing Strategy

### Unit Tests

1. **Test: CORS блокирует `host.docker.internal` в prod-профиле**
   - Активировать профиль `prod`
   - Отправить запрос с `Origin: http://host.docker.internal:9999`
   - Ожидать: 403 Forbidden или отсутствие `Access-Control-Allow-Origin` header

2. **Test: CORS разрешает `host.docker.internal` в dev-профиле**
   - Активировать профиль `dev` (или без профиля)
   - Отправить запрос с `Origin: http://host.docker.internal:9999`
   - Ожидать: 200 OK с `Access-Control-Allow-Origin: http://host.docker.internal:9999`

### Integration Tests

3. **Test: Явно указанные origins работают в prod**
   - Установить `CORS_ALLOWED_ORIGINS=https://swarmhost.tech/notebox`
   - Активировать профиль `prod`
   - Отправить запрос с `Origin: https://swarmhost.tech/notebox`
   - Ожидать: 200 OK с корректными CORS headers

### Manual Verification

4. Запустить приложение с `SPRING_PROFILES_ACTIVE=prod`
5. Выполнить curl-запрос с `Origin: http://host.docker.internal:9999`
6. Убедиться, что запрос отклонён

---

## Risk Assessment

### Потенциальные риски при исправлении

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| E2E тесты перестанут работать | Низкая | Средний | Тесты используют профиль `test` или `dev`, где wildcard сохранится |
| Ошибка в определении профиля | Низкая | Высокий | Добавить fallback на `dev` если профиль не указан |
| Несовместимость с CI/CD | Низкая | Средний | CI/CD обычно не использует профиль `prod` |

### Что может сломаться

1. **E2E тесты с Playwright** — если тесты запускаются с профилем `prod` (маловероятно)
2. **Local development** — нет, профиль `dev` сохранит wildcard
3. **Production** — желаемое изменение: wildcard будет удалён

### Митигация

- Использовать `activeProfile != "prod" && activeProfile != "production"` для поддержки обоих вариантов
- Установить default profile как `dev` для безопасного fallback
- Добавить тесты для проверки поведения в обоих профилях

---

## Severity Assessment

**Severity:** MEDIUM

**Обоснование:**
- **Impact:** Возможность CSRF-атаки для кражи/изменения данных пользователя
- **Exploitability:** Требует доступа к Docker network или host machine
- **Scope:** Влияет на все аутентифицированные endpoints
- **Attack complexity:** Средняя — требует запуска приложения на host.docker.internal

---

## Conclusion

Баг представляет собой регрессию безопасности, введённую для поддержки E2E-тестирования. Исправление требует минимальных изменений: добавление проверки Spring-профиля на строке 61 `SecurityConfig.kt`. После исправления wildcard-паттерн будет применяться только в dev/test окружениях, а production будет защищён от CSRF-атак через Docker network.
