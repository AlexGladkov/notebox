# Диагностический отчёт: Кнопка Demo Login не работает

**ID бага:** fix-demo-login-button-does-not-work  
**Дата диагностики:** 2026-05-14  
**Severity:** MEDIUM  
**Статус:** ✅ ПРИЧИНА НАЙДЕНА, ИСПРАВЛЕНИЕ ВНЕСЕНО В КОД

---

## Bug Summary

При нажатии на кнопку "Войти в демо" на странице входа NoteBox запрос к API не достигает backend сервера из-за неправильной конфигурации nginx proxy — запросы перенаправляются на MinIO вместо backend.

---

## Root Cause

### Файл и строка
**Файл:** `nginx/default.conf` (строки 4-5)  
**Уверенность:** HIGH

### Описание проблемы

Устаревшая конфигурация nginx в Docker контейнере направляла все запросы `/api/*` на MinIO (`http://minio:9000`) вместо backend сервера (`http://server:8080`).

**Неправильная конфигурация (в Docker контейнере):**
```nginx
resolver 127.0.0.11 valid=5s ipv6=off;
set $backend_upstream http://minio:9000;  # ← ОШИБКА!

location /api/ {
    proxy_pass $backend_upstream$request_uri;  # ← Направляет на MinIO
}
```

**Правильная конфигурация (в исходном коде после коммита 458a5d6):**
```nginx
location /api/ {
    proxy_pass http://server:8080;  # ← Правильный upstream
}
```

### Почему это сломало демо-логин

1. Пользователь нажимает кнопку "Войти в демо"
2. Frontend отправляет `POST /api/auth/demo`
3. Nginx перенаправляет запрос на MinIO (`http://minio:9000`)
4. MinIO не понимает этот endpoint и возвращает XML ошибку:
   ```xml
   <Error><Code>BadRequest</Code><Message>An unsupported API call...</Message></Error>
   ```
5. Frontend получает HTTP 400 с Content-Type: application/xml
6. apiClient пытается распарсить XML как JSON — ошибка парсинга
7. Пользователь видит: "Не удалось войти в демо-режим. Попробуйте еще раз."

---

## Consilium Findings

### Architect (Code Tracer)

**Согласие с корневой причиной:** ✅ ДА

**Ключевые находки:**
- Проблема в инфраструктурном слое (nginx), не в коде приложения
- Backend работает корректно (проверено прямым подключением на порт 8080)
- Frontend код реализован правильно
- Исправление уже внесено в коммит `458a5d6`
- Docker контейнер не был пересобран после исправления

**Data Flow анализ:**
```
User Click → LoginView.vue:handleDemoLogin() → authService.loginDemo() 
→ apiClient.post('/api/auth/demo') → nginx proxy 
→ [BROKEN] MinIO:9000 → XML Error 400
→ [EXPECTED] server:8080 → JSON Success 200
```

### Stack Expert (Technology Stack)

**Согласие с корневой причиной:** ✅ ДА

**Ключевые находки:**
- Все компоненты backend корректно реализованы:
  - `AuthController.loginDemo()` — правильная обработка сессий
  - `DemoAuthProvider.createDemoSession()` — создание демо-пользователя
  - `SecurityConfig` — публичный доступ к `/api/auth/**`
- Конфигурация docker-compose.yml корректна (`DEMO_MODE_ENABLED=true`)
- Проблема локализована исключительно в nginx proxy конфигурации
- Vite proxy в development режиме не затронут

---

## Reproduction Results

**Баг воспроизведён:** ✅ ДА

### Сетевые ошибки

| Запрос | Результат | Причина |
|--------|-----------|---------|
| `POST /api/auth/demo` через nginx (порт 33440) | 400 Bad Request (XML) | Запрос попал в MinIO |
| `POST /api/auth/demo` напрямую к backend (порт 33441) | 200 OK (JSON) | Backend работает |

### Консольные ошибки

```javascript
ApiError: HTTP error! status: 400
  code: "UNKNOWN_ERROR"
  message: "HTTP error! status: 400"
  
Demo login failed: ApiError: HTTP error! status: 400
```

---

## Affected Files

### Файлы для изменения

| Файл | Действие | Описание |
|------|----------|----------|
| `nginx/default.conf` | ✅ УЖЕ ИСПРАВЛЕН | proxy_pass теперь направляет на `http://server:8080` |

### Связанные файлы (не требуют изменений)

| Файл | Статус | Роль |
|------|--------|------|
| `src/views/LoginView.vue` | ✅ Корректен | Обработчик handleDemoLogin() |
| `src/services/auth/authService.ts` | ✅ Корректен | Метод loginDemo() |
| `src/api/client.ts` | ✅ Корректен | HTTP клиент |
| `server/.../AuthController.kt` | ✅ Корректен | Endpoint /api/auth/demo |
| `server/.../DemoAuthProvider.kt` | ✅ Корректен | Создание демо-сессии |
| `docker-compose.yml` | ✅ Корректен | Конфигурация сервисов |

---

## Fix Plan

### Шаг 1: Верификация исправления в исходном коде (УЖЕ ВЫПОЛНЕНО)

Коммит `458a5d6` (2026-05-14 12:27:44) уже содержит исправление:

```nginx
# nginx/default.conf
location /api/ {
    proxy_pass http://server:8080;  # Прямой upstream без переменных
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
}
```

### Шаг 2: Пересборка Docker образа nginx

```bash
docker-compose build nginx-proxy
```

### Шаг 3: Перезапуск контейнера с новой конфигурацией

```bash
docker-compose up -d --force-recreate nginx-proxy
```

### Шаг 4: Верификация исправления

```bash
# Проверка конфигурации в контейнере
docker exec <container-name> cat /etc/nginx/conf.d/default.conf
# Должно содержать: proxy_pass http://server:8080;

# Тест API запроса
curl -X POST http://localhost:33440/api/auth/demo \
  -H "Content-Type: application/json"
# Должен вернуть HTTP 200 с JSON, а не HTTP 400 с XML
```

---

## Testing Strategy

### 1. Unit тесты (не применимы)
Баг в инфраструктуре, unit тесты backend уже проходят.

### 2. Integration тесты

```bash
# Тест через nginx proxy
curl -v -X POST http://localhost:${NGINX_PORT}/api/auth/demo \
  -H "Content-Type: application/json"

# Ожидаемый результат:
# HTTP 200 OK
# Content-Type: application/json
# Body: {"success":true,"data":{"id":"...","email":"demo@notebox.local",...}}
```

### 3. E2E тесты

1. Открыть http://localhost:${NGINX_PORT}/
2. Нажать кнопку "Войти в демо"
3. Проверить:
   - Пользователь перенаправлен на главную страницу
   - В header показано имя "Demo User"
   - Загружены демо-папки и заметки

### 4. Регрессионное тестирование

- Проверить OAuth логин (Google, Apple)
- Проверить другие API endpoints (/api/notes, /api/folders)
- Проверить WebSocket соединения

---

## Risk Assessment

### Риски исправления

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Неправильная пересборка образа | Низкая | Проверить конфигурацию в контейнере после деплоя |
| Регрессия других API endpoints | Низкая | Все /api/* используют тот же proxy_pass |
| Прерывание активных сессий | Низкая | Перезапуск nginx не затрагивает backend сессии |

### Что может сломаться

1. **Ничего** — исправление восстанавливает ожидаемое поведение
2. DNS resolution для `server:8080` — маловероятно, т.к. Docker DNS надёжен
3. Кэш nginx — рестарт с `--force-recreate` очищает состояние

### Митигация

- Тестировать в staging перед production
- Сохранить старый Docker образ до подтверждения исправления
- Мониторить логи nginx после деплоя

---

## Дополнительные заметки

### Почему конфигурации разошлись

1. Исправление было внесено в `nginx/default.conf` (коммит `458a5d6`)
2. Docker образ не был пересобран после коммита
3. Запущенный контейнер продолжал использовать старую конфигурацию из момента сборки образа

### Рекомендации по предотвращению

1. **CI/CD пайплайн** должен автоматически пересобирать образы при изменении конфигурации
2. **Health checks** должны проверять не только доступность сервисов, но и корректность роутинга
3. **Мониторинг** — алерты на HTTP 4xx ошибки с Content-Type: application/xml от nginx

---

## Заключение

Баг "Кнопка Demo Login не работает" вызван **устаревшей конфигурацией nginx в Docker контейнере**, которая направляла API запросы на MinIO вместо backend сервера.

**Исправление в коде уже выполнено** (коммит `458a5d6`). Для применения исправления необходимо **пересобрать и перезапустить Docker контейнер nginx**.

Это инфраструктурная проблема, не требующая изменений в коде приложения.
