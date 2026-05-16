# Диагностический отчёт: Кнопка 'Войти в демо' не работает

**ID бага:** knopka-voyti-v-demo-ne-rabotaet  
**Дата диагностики:** 2026-05-16  
**Severity:** HIGH (все API endpoints недоступны)  
**Статус:** ✅ ИСПРАВЛЕНО В КОДЕ — ТРЕБУЕТСЯ ПЕРЕСБОРКА DOCKER ОБРАЗА

---

## Bug Summary

При нажатии на кнопку "Войти в демо" на странице входа NoteBox авторизация не происходит. API запросы направляются на MinIO (S3 storage) вместо backend сервера из-за неправильной конфигурации nginx proxy в Docker контейнере.

---

## Root Cause

**Файл:** `nginx/default.conf` (строки 4-5)  
**Уверенность:** HIGH (подтверждено воспроизведением)  
**Статус исправления:** ✅ ИСПРАВЛЕНО в коммите 458a5d6 (2026-05-14)

### Описание проблемы

Устаревший Docker контейнер nginx использовал неправильную конфигурацию:

```nginx
# НЕПРАВИЛЬНАЯ конфигурация (в старом контейнере)
set $backend_upstream http://minio:9000;
location /api/ {
    proxy_pass $backend_upstream$request_uri;
}
```

Все API запросы (`/api/*`) перенаправлялись на MinIO (S3 storage) вместо backend сервера. MinIO возвращал XML ошибки, так как не понимает REST API приложения.

### Текущая конфигурация (ПРАВИЛЬНАЯ)

```nginx
# nginx/default.conf — ИСПРАВЛЕНО
location /api/ {
    proxy_pass http://server:8080;  # ✅ Правильный upstream
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    ...
}
```

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с root cause:** ✅ ДА

**Находки:**
- Исправление уже внесено в коммит `458a5d6` (2026-05-14 12:27)
- Дополнительные улучшения в коммите `632e353` (X-Forwarded headers, timeouts)
- Data flow: Frontend → nginx → server:8080 (теперь работает корректно)
- Проблема была в инфраструктуре (Docker), не в коде приложения

### Stack Expert (Docker/Nginx)

**Согласие с root cause:** ✅ ДА

**Находки:**
- docker-compose.yml корректно настроен
- nginx/Dockerfile правильно копирует конфигурацию
- .env.example содержит правильные defaults (`DEMO_MODE_ENABLED=true`)
- Проблема: старый Docker контейнер не был пересобран после исправления

### Консенсус

✅ **Оба субагента согласны** с root cause:
- Баг вызван устаревшей конфигурацией nginx в Docker контейнере
- Исправление уже в коде (коммит 458a5d6)
- Для применения нужна пересборка Docker образа

**Разногласий нет.**

---

## Reproduction Results

**Баг воспроизведён:** ✅ ДА  
**Метод:** API тестирование (curl)

### Ключевые результаты

| Запрос | Старый контейнер (порт 33481) | Новый контейнер (порт 33482) |
|--------|-------------------------------|------------------------------|
| `POST /api/auth/demo` | ❌ HTTP 400 XML (MinIO error) | ✅ HTTP 200 JSON |
| `GET /api/config` | ❌ HTTP 403 XML (Access Denied) | ✅ HTTP 200 JSON |

### Ответ MinIO (ошибка)
```xml
<Error>
  <Code>BadRequest</Code>
  <Message>An unsupported API call for method: POST at '/api/auth/demo'</Message>
</Error>
```

### Ответ backend (успех)
```json
{
  "data": {
    "email": "demo@notebox.app",
    "name": "Demo User"
  }
}
```

---

## Affected Files

| Файл | Статус | Описание |
|------|--------|----------|
| `nginx/default.conf` | ✅ Исправлен | proxy_pass http://server:8080 |

### Связанные файлы (не требуют изменений)

| Файл | Статус |
|------|--------|
| `nginx/Dockerfile` | ✅ Корректен |
| `docker-compose.yml` | ✅ Корректен |
| `src/views/LoginView.vue` | ✅ Корректен |
| `src/services/auth/authService.ts` | ✅ Корректен |
| `server/.../AuthController.kt` | ✅ Корректен |

---

## Fix Plan

### Статус: ИЗМЕНЕНИЯ КОДА НЕ ТРЕБУЮТСЯ

Исправление уже внесено в репозиторий. Для применения:

### Шаг 1: Пересборка Docker образа nginx

```bash
docker-compose build --no-cache nginx
```

### Шаг 2: Перезапуск контейнера

```bash
docker-compose up -d --force-recreate nginx
```

### Шаг 3: Верификация

```bash
# Проверка конфигурации в контейнере
docker exec <nginx-container> cat /etc/nginx/conf.d/default.conf
# Должно содержать: proxy_pass http://server:8080;

# Тест API
curl -X POST http://localhost/api/auth/demo
# Должен вернуть HTTP 200 с JSON
```

---

## Testing Strategy

### 1. API тестирование

```bash
# Демо-логин
curl -v -X POST http://localhost/api/auth/demo
# Ожидание: HTTP 200, Content-Type: application/json

# Проверка конфига
curl http://localhost/api/config
# Ожидание: {"demoModeEnabled": true}
```

### 2. E2E тестирование

1. Открыть http://localhost/
2. Нажать "Войти в демо"
3. Проверить редирект на главную страницу
4. Проверить имя "Demo User" в header

### 3. Регрессионное тестирование

- OAuth логин (Google, Apple)
- CRUD операции с заметками
- WebSocket соединения

---

## Risk Assessment

### Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Кэш nginx | Низкая | `--force-recreate` очищает состояние |
| DNS resolution | Очень низкая | Docker DNS надёжен |
| Прерывание сессий | Низкая | Backend сессии не затронуты |

### Что может сломаться

**Ничего** — исправление восстанавливает ожидаемое поведение без изменения API контрактов.

---

## Заключение

Баг "Кнопка 'Войти в демо' не работает" **уже исправлен в коде** (коммит 458a5d6 от 2026-05-14).

Причина проблемы — **устаревший Docker контейнер** с неправильной конфигурацией nginx, который направлял API запросы на MinIO вместо backend.

**Действие:** Пересобрать и перезапустить Docker образ nginx.

**Изменения кода не требуются.**
