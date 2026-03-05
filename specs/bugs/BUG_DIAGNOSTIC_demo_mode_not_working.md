# Bug Diagnostic: Demo mode not working

## Bug Summary
При нажатии на кнопку "Войти в демо" пользователь видит ошибку "Не удалось войти в демо-режим. Попробуйте еще раз." из-за того, что все API запросы возвращают 502 Bad Gateway.

## Root Cause

**Файл:** `docker-compose.test.yml`
**Строки:** 73-75 (volumes для nginx-proxy)

### Описание:
В `docker-compose.test.yml` жёстко закодированы пути к nginx конфигурации от **другого теста**:

```yaml
nginx-proxy:
  volumes:
  - /tmp/swarm-test-nginx/notebox-account-title-visibility-is-ba-test/default.conf:/etc/nginx/conf.d/default.conf:ro
  - /tmp/swarm-frontends/notebox-account-title-visibility-is-ba-test:/usr/share/nginx/html:ro
```

Путь `notebox-account-title-visibility-is-ba-test` - это имя предыдущей задачи, которое было случайно закоммичено в репозиторий.

### Механизм ошибки:
1. При запуске тестовой среды nginx-proxy пытается загрузить конфигурацию из `/tmp/swarm-test-nginx/notebox-account-title-visibility-is-ba-test/default.conf`
2. Этот файл либо не существует, либо содержит неверную конфигурацию
3. nginx не может проксировать запросы к backend серверу
4. Все API запросы (`/api/auth/me`, `/api/config`, `/api/auth/demo`) возвращают 502 Bad Gateway

### Дополнительная проблема:
`.env.production` изменён с `VITE_API_URL=""` на `VITE_API_URL=` (без кавычек), что может вызывать проблемы с парсингом переменной окружения.

## Consilium Findings

### Architect (Code Tracer):
- Определил, что 502 Bad Gateway указывает на проблему связи nginx → backend
- Нашёл жёстко закодированные пути в docker-compose.test.yml
- Проследил data flow от кнопки до API вызова

### Stack Expert:
- Подтвердил, что backend настроен корректно (DEMO_MODE_ENABLED=true)
- Выявил проблему с конфигурацией nginx-proxy volumes
- Подтвердил, что сетевая конфигурация Docker корректна

### Консенсус:
Оба субагента согласны, что корневая причина - неверные пути в docker-compose.test.yml для nginx конфигурации.

## Reproduction Results

**Статус:** Баг успешно воспроизведён

### Консольные ошибки:
- `GET /api/auth/me => 502 Bad Gateway`
- `GET /api/config => 502 Bad Gateway`
- `POST /api/auth/demo => 502 Bad Gateway`

### Видимое поведение:
Сообщение об ошибке: "Не удалось войти в демо-режим. Попробуйте еще раз."

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `docker-compose.test.yml` | Удалить жёстко закодированные пути | Параметризовать пути через переменные окружения или удалить файл из репозитория |
| `.env.production` | Исправить | Вернуть `VITE_API_URL=""` (с кавычками) |

## Fix Plan

### Шаг 1: Исправить .env.production
Вернуть формат с кавычками:
```diff
-VITE_API_URL=
+VITE_API_URL=""
```

### Шаг 2: Исправить docker-compose.test.yml (Option A - рекомендуется)
Удалить `docker-compose.test.yml` из репозитория и добавить в `.gitignore`:
```diff
+docker-compose.test.yml
```
Этот файл должен генерироваться системой тестирования динамически.

### Шаг 2: Альтернатива (Option B)
Параметризовать пути через переменные окружения:
```yaml
nginx-proxy:
  volumes:
  - ${NGINX_CONFIG_PATH:-/tmp/swarm-test-nginx/default}/default.conf:/etc/nginx/conf.d/default.conf:ro
  - ${FRONTEND_PATH:-/tmp/swarm-frontends/default}:/usr/share/nginx/html:ro
```

### Шаг 3: Проверить vite.config.ts
Изменение `base: '/'` корректно и должно остаться.

## Testing Strategy

1. **Unit test:** Проверить, что API клиент корректно формирует URL с пустым `VITE_API_URL`
2. **Integration test:** Запустить тестовую среду и проверить:
   - nginx конфигурация загружается корректно
   - API запросы проксируются на backend
   - Кнопка "Войти в демо" работает
3. **E2E test:** Воспроизвести сценарий из reproduction report и убедиться, что ошибка исчезла

## Risk Assessment

### Низкий риск:
- Исправление `.env.production` - минимальное изменение формата

### Средний риск:
- Удаление `docker-compose.test.yml` из репозитория может потребовать обновления CI/CD пайплайнов

### Митигация:
- Перед удалением файла убедиться, что система тестирования может генерировать его динамически
- Проверить, что в CI/CD нет зависимостей от этого файла

## Additional Notes

- `vite.config.ts` с `base: '/'` - корректное изменение, оставить как есть
- Backend демо-режим настроен корректно: `DEMO_MODE_ENABLED=true`
- Docker сеть `notebox-network` настроена корректно
