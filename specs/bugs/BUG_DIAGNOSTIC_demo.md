# Диагностический отчёт: Demo кнопка пропала

## Bug Summary
На странице логина NoteBox отображаются только кнопки Google и Apple OAuth, а кнопка "Войти в демо" отсутствует, хотя она должна быть видна.

## Root Cause
**Файл:** `.env.example:17` (отсутствует строка) / `docker-compose.yml:60` / `application.yml:55`

Переменная окружения `DEMO_MODE_ENABLED` не задана в конфигурационных файлах окружения (`.env.example`, `.env.development`, `.env.production`), а значение по умолчанию установлено в `false`:

```yaml
# application.yml:53-55
demo:
  mode:
    enabled: ${DEMO_MODE_ENABLED:false}
```

```yaml
# docker-compose.yml:60
DEMO_MODE_ENABLED: ${DEMO_MODE_ENABLED:-false}
```

При запуске сервера без явно заданной переменной `DEMO_MODE_ENABLED=true`, эндпоинт `/api/config` возвращает `{ demoModeEnabled: false }`, и кнопка Demo не отображается из-за условия `v-if="demoModeEnabled"` в `LoginView.vue:12`.

## Analysis

### Поток данных при возникновении бага:

1. **Пользователь открывает страницу `/login`**
2. **`LoginView.vue` монтируется** и в `onMounted` (строка 36-49) вызывает:
   ```typescript
   const config = await authService.getConfig();
   demoModeEnabled.value = config.demoModeEnabled;
   ```
3. **`authService.getConfig()`** отправляет запрос `GET /api/config`
4. **`ConfigController.kt`** возвращает значение из конфигурации:
   ```kotlin
   @Value("\${demo.mode.enabled}") private val demoModeEnabled: Boolean
   // demoModeEnabled = false (значение по умолчанию)
   ```
5. **`demoModeEnabled.value = false`**
6. **Кнопка DemoButton не отображается** из-за `v-if="demoModeEnabled"` (строка 12)

### Почему баг возникает:

1. В `.env.example` отсутствует переменная `DEMO_MODE_ENABLED`
2. В `.env.development` и `.env.production` отсутствует эта переменная
3. Значение по умолчанию `false` в `application.yml` и `docker-compose.yml`
4. При развёртывании без явного указания `DEMO_MODE_ENABLED=true` кнопка не показывается

### Проверка существующих файлов:

| Файл | Содержит DEMO_MODE_ENABLED |
|------|---------------------------|
| `.env.example` | Нет |
| `.env.development` | Нет |
| `.env.production` | Нет |
| `application.yml` | Да (default: false) |
| `docker-compose.yml` | Да (default: false) |

## Affected Files

| Файл | Изменения |
|------|-----------|
| `.env.example` | Добавить `DEMO_MODE_ENABLED=true` |
| `.env.development` | Добавить `DEMO_MODE_ENABLED=true` |
| `docker-compose.yml` | Изменить значение по умолчанию на `true` |

## Fix Plan

### Шаг 1: Обновить `.env.example`
Добавить переменную `DEMO_MODE_ENABLED=true` в раздел Server:

```env
# Server
SERVER_PORT=8080
DEMO_MODE_ENABLED=true
```

### Шаг 2: Обновить `.env.development`
Добавить переменную для локальной разработки:

```env
VITE_API_URL=http://localhost:8080
DEMO_MODE_ENABLED=true
```

### Шаг 3 (Опционально): Обновить `docker-compose.yml`
Изменить значение по умолчанию:

```yaml
DEMO_MODE_ENABLED: ${DEMO_MODE_ENABLED:-true}
```

**Примечание:** Изменение значения по умолчанию в `docker-compose.yml` на `true` может быть нежелательным для production-окружений. Рекомендуется оставить `false` по умолчанию и явно задавать `DEMO_MODE_ENABLED=true` в файлах окружения.

### Альтернативный подход

Если кнопка Demo должна быть **всегда** видна (feature flag не нужен), можно упростить:

1. Удалить проверку `v-if="demoModeEnabled"` в `LoginView.vue:12`
2. Удалить запрос `/api/config` в `onMounted`
3. Удалить feature flag из backend-конфигурации

**Не рекомендуется**, так как feature flag полезен для отключения демо-режима в production.

## Testing Strategy

### Ручное тестирование:

1. **Проверка с включённым DEMO_MODE_ENABLED:**
   - Установить `DEMO_MODE_ENABLED=true` в переменных окружения
   - Перезапустить сервер
   - Открыть страницу логина
   - **Ожидание:** Кнопка "Войти в демо" отображается рядом с Google и Apple

2. **Проверка с выключенным DEMO_MODE_ENABLED:**
   - Установить `DEMO_MODE_ENABLED=false` в переменных окружения
   - Перезапустить сервер
   - Открыть страницу логина
   - **Ожидание:** Кнопка "Войти в демо" НЕ отображается

3. **Проверка функционала демо-входа:**
   - Включить DEMO_MODE_ENABLED
   - Нажать "Войти в демо"
   - **Ожидание:** Успешный вход, появление баннера демо-режима

### Автоматические тесты:

```typescript
// frontend: LoginView.spec.ts
describe('LoginView', () => {
  it('should show Demo button when demoModeEnabled is true', async () => {
    // Mock authService.getConfig to return { demoModeEnabled: true }
    vi.spyOn(authService, 'getConfig').mockResolvedValue({ demoModeEnabled: true });

    const wrapper = mount(LoginView);
    await flushPromises();

    expect(wrapper.findComponent(DemoButton).exists()).toBe(true);
  });

  it('should hide Demo button when demoModeEnabled is false', async () => {
    vi.spyOn(authService, 'getConfig').mockResolvedValue({ demoModeEnabled: false });

    const wrapper = mount(LoginView);
    await flushPromises();

    expect(wrapper.findComponent(DemoButton).exists()).toBe(false);
  });
});
```

## Risk Assessment

### Риски исправления:

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Демо-режим случайно включён в production | Низкий | Переменная явно задаётся, по умолчанию false |
| Регрессия OAuth кнопок | Очень низкий | Изменения не затрагивают OAuth логику |
| Нагрузка от демо-пользователей | Низкий | Feature flag позволяет быстро отключить |

### Что может сломаться:

- Ничего критичного — изменения касаются только конфигурационных файлов
- Существующие развёртывания без переменной `DEMO_MODE_ENABLED` продолжат работать с кнопкой Demo, скрытой по умолчанию

### Рекомендации:

1. Реализовать исправление путём добавления переменной в файлы окружения
2. Документировать переменную `DEMO_MODE_ENABLED` в README
3. Для production явно задавать значение в зависимости от требований

---

**Дата диагностики:** 2026-02-18
**Критичность:** MEDIUM
**Затронутая функциональность:** Страница входа, демо-режим
