# Architect Analysis: Demo Mode Not Working

## Root Cause

**502 Bad Gateway** - nginx-proxy не может связаться с backend сервером.

### Критические проблемы:

1. **`docker-compose.test.yml` содержит жёстко закодированные пути к nginx конфигурации от ДРУГОГО теста:**
   ```yaml
   volumes:
   - /tmp/swarm-test-nginx/notebox-account-title-visibility-is-ba-test/default.conf:/etc/nginx/conf.d/default.conf:ro
   ```
   Путь `notebox-account-title-visibility-is-ba-test` - это имя предыдущей задачи, не текущей!

2. **`.env.production` изменён некорректно:**
   - Main: `VITE_API_URL=""`
   - Текущая ветка: `VITE_API_URL=` (без кавычек)

## Data Flow

1. Пользователь нажимает "Войти в демо" → `LoginView.vue:59-68`
2. Вызывается `handleDemoLogin()` → `authService.loginDemo()`
3. API клиент (`src/api/client.ts:4`) формирует URL:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
   ```
4. С пустым `VITE_API_URL` запрос идёт на `/api/auth/demo` (относительный путь)
5. Nginx должен проксировать на backend, но:
   - Конфигурация nginx загружена от другого теста
   - Путь к upstream сервису может быть неверным
6. **Результат: 502 Bad Gateway**

## Affected Modules

### Frontend:
- `/src/views/LoginView.vue` - точка входа демо-режима
- `/src/services/auth/authService.ts` - API вызовы
- `/src/api/client.ts:4` - API_BASE_URL инициализация

### Infrastructure:
- `.env.production` - изменено значение VITE_API_URL
- `vite.config.ts` - добавлено `base: '/'`
- `docker-compose.test.yml` - содержит неверные пути

## Recent Changes

```
1498a22 fix: добавлен nginx-proxy в сеть notebox-network
545721c fix: добавлена сеть notebox-network для nginx-proxy
```

Эти коммиты пытались исправить сетевую проблему, но не устранили корневую причину - жёстко закодированные пути в docker-compose.test.yml.

## Architectural Issue

`docker-compose.test.yml` не должен содержать жёстко закодированных путей. Пути должны быть:
1. Параметризованы через переменные окружения
2. Или файл не должен быть в репозитории (генерироваться системой тестирования)
