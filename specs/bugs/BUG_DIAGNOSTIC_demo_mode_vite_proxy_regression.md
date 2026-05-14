# Bug Diagnostic: Невозможно зайти в демо режим - показывает ошибку

## Bug Summary

При нажатии на кнопку "Войти в демо" в NoteBox API запросы не достигают backend-сервера. Вместо JSON ответов возвращаются XML ошибки (403 Forbidden, 400 Bad Request). Причина: hardcoded Docker IP адрес `172.23.0.4:8080` в `vite.config.ts`, который становится недействительным после перезапуска контейнеров.

**Дата диагностики:** 2026-05-14  
**Серьёзность:** MEDIUM  
**Баг воспроизведён:** Да

---

## Root Cause

**Файл:** `vite.config.ts`  
**Строки:** 10, 18  
**Уверенность:** HIGH

### Описание проблемы:

Файл `vite.config.ts` содержит hardcoded IP адрес Docker контейнера:

```typescript
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://172.23.0.4:8080',  // <-- ПРОБЛЕМА: hardcoded IP
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://172.23.0.4:8080',  // <-- ПРОБЛЕМА: hardcoded IP
        changeOrigin: true,
      },
    },
  },
})
```

### Механизм ошибки:

1. **Docker IP динамический**: При каждом запуске контейнера Docker назначает новый IP адрес
2. **IP стейл**: IP `172.23.0.4` был актуален на момент коммита, но после перезапуска контейнеров стал недействительным
3. **Proxy не работает**: Vite proxy пытается подключиться к несуществующему адресу
4. **XML ошибки**: Nginx/proxy возвращает XML ошибки вместо проксирования к backend
5. **JSON parse fails**: Frontend ожидает JSON, но получает XML, что вызывает ошибку парсинга

### История регрессии:

| Коммит | Дата | Описание |
|--------|------|----------|
| ee0cca0 | 2026-03-05 | fix: исправлен демо-режим (правильное исправление) |
| 3c5ead7 | 2026-05-03 | fix: временно отключена миграция (**РЕГРЕССИЯ**) |

Коммит 3c5ead7 переиспользовал старую конфигурацию с hardcoded IP вместо использования переменных окружения или DNS-имён.

---

## Consilium Findings

### Architect (Code Tracer):

**Root Cause Agreed:** Да

- Выявил hardcoded IP `172.23.0.4:8080` в vite.config.ts как корневую причину
- Проследил data flow от кнопки "Войти в демо" до API ошибки
- Идентифицировал регрессию в коммите 3c5ead7
- Backend код (AuthController, DemoAuthProvider) работает корректно, но недостижим

**Ключевые находки:**
- `vite.config.ts:10,18` - hardcoded IP
- Backend эндпоинты `/api/auth/demo` и `/api/config` реализованы правильно
- Проблема исключительно на уровне frontend proxy конфигурации

### Stack Expert:

**Root Cause Agreed:** Да

- Подтвердил, что Spring Boot конфигурация корректна
- `DEMO_MODE_ENABLED=true` правильно настроен в docker-compose.yml и .env.example
- Security конфигурация разрешает публичный доступ к `/api/auth/**` и `/api/config`
- Framework и зависимости стабильны (Spring Boot 3.2.2, Vue 3.4.0, Vite 5.0.0)

**Ключевые находки:**
- Nginx конфигурация правильная, использует DNS resolver
- Docker network настроен корректно
- Проблема в Vite proxy, не в nginx или backend

### Консенсус:

Оба субагента **согласны** с корневой причиной:
- **Primary issue:** Hardcoded IP `172.23.0.4:8080` в `vite.config.ts` (строки 10, 18)
- **Root cause type:** Конфигурационная регрессия
- **Backend status:** Работает корректно, но недостижим из-за proxy

**Разногласия:** Нет

---

## Reproduction Results

**Статус:** Баг успешно воспроизведён

### Консольные ошибки:

```
GET /api/config => 403 Forbidden (XML: AccessDenied)
POST /api/auth/demo => 400 Bad Request (XML: unsupported API call)
```

### Сетевые проблемы:

- Все API запросы к `/api/*` не достигают backend сервера
- Nginx возвращает XML ответы вместо JSON
- Frontend не может распарсить XML как JSON

### Видимое поведение:

Пользователь видит сообщение: **"Не удалось войти в демо-режим. Попробуйте еще раз."**

---

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `vite.config.ts` | Modify | Заменить hardcoded IP на localhost или переменную окружения |

### Связанные файлы (не требуют изменений):

| Файл | Статус |
|------|--------|
| `docker-compose.yml` | OK - DEMO_MODE_ENABLED=true |
| `.env.example` | OK - DEMO_MODE_ENABLED=true |
| `server/src/main/resources/application.yml` | OK - ${DEMO_MODE_ENABLED:false} (перезаписывается docker-compose) |
| `nginx/default.conf` | OK - динамический resolver |
| `src/services/auth/authService.ts` | OK - API клиент работает |
| `server/.../AuthController.kt` | OK - эндпоинт реализован |
| `server/.../DemoAuthProvider.kt` | OK - демо логика работает |

---

## Fix Plan

### Шаг 1: Исправить vite.config.ts (ОБЯЗАТЕЛЬНО)

**Файл:** `vite.config.ts`  
**Действие:** Modify

Заменить hardcoded IP на localhost для development:

```typescript
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // localhost для development
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // localhost для preview
        changeOrigin: true,
      },
    },
  },
})
```

### Почему localhost:

1. В development режиме backend запускается на хост-машине на порту 8080
2. Docker-compose мапит порт 8080 контейнера на хост: `"${SERVER_PORT:-8080}:8080"`
3. Frontend (Vite dev server) обращается к localhost:8080, который проксируется в контейнер
4. Это стандартный паттерн для Vite + Docker development

### Альтернативный вариант (для CI/staging):

Если нужна поддержка разных окружений, использовать переменные окружения:

```typescript
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

---

## Testing Strategy

### 1. Smoke Test (обязательно):

После исправления запустить:

```bash
# Запустить backend
docker-compose up -d

# Запустить frontend в dev режиме
npm run dev

# Проверить API доступность
curl http://localhost:5173/api/config
# Ожидаемый результат: JSON {"success":true,"data":{"demoModeEnabled":true}}

curl -X POST http://localhost:5173/api/auth/demo
# Ожидаемый результат: JSON с данными пользователя
```

### 2. UI Test:

1. Открыть http://localhost:5173 в браузере
2. Нажать кнопку "Войти в демо"
3. **Ожидаемый результат:** Успешный вход, перенаправление на главную страницу
4. **Фактический результат должен:** Соответствовать ожидаемому

### 3. Console Check:

В DevTools браузера не должно быть:
- Ошибок 4xx/5xx для `/api/*`
- XML ответов вместо JSON
- Ошибок парсинга JSON

---

## Risk Assessment

### Низкий риск:

- Изменение `vite.config.ts` влияет только на development/preview режим
- Production использует nginx proxy, а не Vite proxy
- Изменение минимально и локализовано

### Потенциальные побочные эффекты:

- Если другие разработчики используют Docker IP напрямую, им нужно будет использовать localhost
- CI/CD пайплайны, использующие `npm run preview`, должны будут мапить порт 8080

### Митигация:

- Документировать setup в README
- Проверить CI/CD конфигурацию после исправления
- При необходимости добавить `VITE_BACKEND_URL` в `.env.development`

---

## Additional Notes

### Архитектурные рекомендации:

1. **Не использовать hardcoded IP адреса** в конфигурации - они не переносимы
2. **Использовать DNS-имена** для Docker (`server:8080`) или `localhost` для development
3. **Документировать** настройку окружения в README

### Связь с предыдущим багом:

Этот баг отличается от `BUG_DIAGNOSTIC_demo_mode_not_working.md`:
- Предыдущий баг: жёсткие пути в docker-compose.test.yml (исправлен в ee0cca0)
- Текущий баг: hardcoded IP в vite.config.ts (регрессия в 3c5ead7)

### Backend работает корректно:

- `AuthController.loginDemo()` (строки 218-246) - реализован правильно
- `DemoAuthProvider.createDemoSession()` - создаёт демо сессию
- `ConfigController.getConfig()` - возвращает `demoModeEnabled: true`
- `SecurityConfig` - разрешает публичный доступ к `/api/auth/**`
