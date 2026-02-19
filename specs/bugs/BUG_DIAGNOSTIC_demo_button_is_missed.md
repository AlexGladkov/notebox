# Диагностический отчёт: Demo button is missed

## Bug Summary
Кнопка "Войти в демо" отсутствует на странице логина NoteBox, потому что переменная окружения `DEMO_MODE_ENABLED` не задана в конфигурационных файлах `.env.development` и `.env.example`, а значение по умолчанию установлено в `false`.

## Root Cause

**Файл:** `server/src/main/resources/application.yml:55`
**Строка конфигурации:**
```yaml
demo:
  mode:
    enabled: ${DEMO_MODE_ENABLED:false}
```

Корневая причина — отсутствие переменной `DEMO_MODE_ENABLED` в файлах окружения:

| Файл | DEMO_MODE_ENABLED |
|------|-------------------|
| `.env.example` | **Отсутствует** |
| `.env.development` | **Отсутствует** |
| `application.yml` | По умолчанию `false` |
| `docker-compose.yml:60` | По умолчанию `false` |

При запуске сервера без явно установленной переменной `DEMO_MODE_ENABLED=true`:
1. Сервер использует значение по умолчанию `false`
2. Эндпоинт `/api/config` возвращает `{ demoModeEnabled: false }`
3. Кнопка Demo не отображается из-за условия `v-if="demoModeEnabled"` в `LoginView.vue:12`

## Analysis

### Поток данных:

1. **Пользователь открывает `/login`**
2. **`LoginView.vue` монтируется** (`src/views/LoginView.vue:36-49`):
   ```typescript
   onMounted(async () => {
     const config = await authService.getConfig();
     demoModeEnabled.value = config.demoModeEnabled;
   });
   ```
3. **`authService.getConfig()`** отправляет `GET /api/config` (`src/services/auth/authService.ts:29-31`)
4. **`ConfigController.kt`** возвращает конфигурацию (`server/.../ConfigController.kt:13-19`):
   ```kotlin
   @Value("\${demo.mode.enabled}") private val demoModeEnabled: Boolean
   // → false (значение по умолчанию, т.к. переменная не установлена)
   ```
5. **`demoModeEnabled.value = false`**
6. **Кнопка не рендерится** из-за `v-if="demoModeEnabled"` (`src/views/LoginView.vue:12`)

### История изменений (git log):

```
d1625a9 fix: возвращено безопасное значение по умолчанию для DEMO_MODE_ENABLED
331a29b fix: удалена некорректная переменная DEMO_MODE_ENABLED из .env.development
d56953a fix: добавлена переменная DEMO_MODE_ENABLED для отображения кнопки Demo
124f4d5 feat: implement demo mode for NoteBox
```

Из истории видно, что переменная была добавлена в `.env.development`, но затем удалена в коммите `331a29b`, что вновь привело к появлению бага.

## Affected Files

| Файл | Требуемые изменения |
|------|---------------------|
| `.env.example` | Добавить `DEMO_MODE_ENABLED=true` |
| `.env.development` | Добавить `DEMO_MODE_ENABLED=true` |

## Fix Plan

### Шаг 1: Обновить `.env.example`

Добавить переменную в раздел "Server":

```env
# Server
SERVER_PORT=8080
DEMO_MODE_ENABLED=true
```

**Почему:** Документирует переменную для всех разработчиков и новых развёртываний.

### Шаг 2: Обновить `.env.development`

Добавить переменную для локальной разработки:

```env
VITE_API_URL=http://localhost:8080
DEMO_MODE_ENABLED=true
```

**Почему:** Включает демо-режим при локальной разработке автоматически.

### Примечание о docker-compose.yml

Значение по умолчанию `${DEMO_MODE_ENABLED:-false}` в `docker-compose.yml:60` **оставить без изменений**. Это правильный подход для production-окружений, где демо-режим должен быть отключен по умолчанию. Включение демо-режима должно происходить через явную установку переменной в файлах окружения.

## Testing Strategy

### Ручное тестирование:

1. **Проверка с включённым DEMO_MODE_ENABLED:**
   - Убедиться, что `DEMO_MODE_ENABLED=true` установлена в `.env.development`
   - Запустить backend: `cd server && ./gradlew bootRun`
   - Открыть `http://localhost:5173/login`
   - **Ожидание:** Кнопка "Войти в демо" видна под кнопками Google и Apple

2. **Проверка функционала демо-входа:**
   - Нажать на кнопку "Войти в демо"
   - **Ожидание:** Успешный вход, редирект на главную страницу, баннер демо-режима вверху

3. **Проверка с выключенным DEMO_MODE_ENABLED:**
   - Установить `DEMO_MODE_ENABLED=false`
   - Перезапустить сервер
   - Открыть страницу логина
   - **Ожидание:** Кнопка "Войти в демо" НЕ отображается

### Автоматические тесты:

```typescript
// src/views/__tests__/LoginView.spec.ts
import { mount, flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import LoginView from '../LoginView.vue';
import DemoButton from '../../components/auth/DemoButton.vue';
import { authService } from '../../services/auth/authService';

describe('LoginView', () => {
  it('should show Demo button when demoModeEnabled is true', async () => {
    vi.spyOn(authService, 'getConfig').mockResolvedValue({ demoModeEnabled: true });

    const wrapper = mount(LoginView, {
      global: { stubs: { RouterLink: true } }
    });
    await flushPromises();

    expect(wrapper.findComponent(DemoButton).exists()).toBe(true);
  });

  it('should hide Demo button when demoModeEnabled is false', async () => {
    vi.spyOn(authService, 'getConfig').mockResolvedValue({ demoModeEnabled: false });

    const wrapper = mount(LoginView, {
      global: { stubs: { RouterLink: true } }
    });
    await flushPromises();

    expect(wrapper.findComponent(DemoButton).exists()).toBe(false);
  });
});
```

## Risk Assessment

### Риски:

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Демо-режим случайно включён в production | Низкий | Значение по умолчанию в `docker-compose.yml` остаётся `false`. Для production необходимо явно установить `DEMO_MODE_ENABLED=true` |
| Нагрузка от демо-пользователей | Низкий | Feature flag позволяет быстро отключить демо-режим |
| Регрессия OAuth кнопок | Очень низкий | Изменения касаются только конфигурационных файлов, логика OAuth не затрагивается |

### Что может сломаться:

- **Ничего критичного** — изменения касаются только файлов конфигурации окружения
- Существующие production-развёртывания продолжат работать без кнопки Demo (если переменная не установлена явно)

### Побочные эффекты:

- При клонировании репозитория разработчики получат `.env.example` с документированной переменной `DEMO_MODE_ENABLED`
- Локальная разработка будет включать кнопку Demo по умолчанию (что является желаемым поведением для тестирования)

---

**Дата диагностики:** 2026-02-19
**Критичность:** MEDIUM
**Затронутая функциональность:** Страница входа, демо-режим
**Время на исправление:** ~5 минут
