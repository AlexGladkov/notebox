# Stack Expert Analysis: Demo Mode Not Working

## Framework Analysis

### Frontend Stack:
- **Vue 3.4.0** with Vite 5.0.0
- **TypeScript**
- API клиент использует `fetch` с `credentials: 'include'`

### Backend Stack:
- **Spring Boot 3.2.2** с Kotlin 1.9.22
- Demo mode включён: `DEMO_MODE_ENABLED=true` (в docker-compose.yml)
- Endpoint: `POST /api/auth/demo`

### Proxy Stack:
- **nginx:alpine** как reverse proxy
- Должен проксировать `/api/*` на backend сервер

## Configuration Issues

### 1. docker-compose.test.yml - КРИТИЧЕСКАЯ ПРОБЛЕМА

```yaml
nginx-proxy:
  volumes:
  - /tmp/swarm-test-nginx/notebox-account-title-visibility-is-ba-test/default.conf:/etc/nginx/conf.d/default.conf:ro
  - /tmp/swarm-frontends/notebox-account-title-visibility-is-ba-test:/usr/share/nginx/html:ro
```

**Проблема:** Пути содержат имя **другого теста** (`notebox-account-title-visibility-is-ba-test`), а не текущего.

### 2. .env.production - Изменение формата

| Ветка | Значение |
|-------|----------|
| main | `VITE_API_URL=""` |
| текущая | `VITE_API_URL=` |

Пустая строка без кавычек может интерпретироваться по-разному.

### 3. vite.config.ts - Добавление

```typescript
base: '/'
```

Это корректное изменение для правильной маршрутизации статических файлов.

## Dependencies

Зависимости проверены - проблем совместимости нет.

## Environment

### Backend настроен корректно:
- `DEMO_MODE_ENABLED: ${DEMO_MODE_ENABLED:-true}` - демо-режим включён
- Server на порту 8080
- CORS разрешён для `/api/auth/**`

### Frontend API Client (src/api/client.ts:4):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
```

С пустым `VITE_API_URL` все запросы идут на относительные пути (`/api/...`).

## Network Configuration

### Docker Network:
- Все сервисы в сети `notebox-network`
- nginx-proxy зависит от server
- server зависит от postgres и minio

### Проблема связи:
nginx-proxy получает запросы, но возвращает 502, потому что:
1. Конфигурация nginx указывает на неверный upstream
2. Путь к конфигурации жёстко закодирован на другой тест

## Root Cause Summary

**502 Bad Gateway** возникает из-за того, что nginx загружает конфигурацию от другого теста (`notebox-account-title-visibility-is-ba-test`), которая:
1. Может не существовать
2. Содержит неверные пути к upstream серверу
3. Не соответствует текущему окружению
