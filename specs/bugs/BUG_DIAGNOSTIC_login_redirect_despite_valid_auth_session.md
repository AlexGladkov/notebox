# Диагностический отчёт: Login redirect despite valid auth session

**Дата анализа:** 2026-05-23  
**Серьёзность:** MEDIUM  
**Статус:** Баг воспроизведён, корневая причина найдена

---

## Bug Summary

При навигации на `/` с валидной SESSION_ID cookie приложение перенаправляет на `/login?redirect=/`, хотя `/api/auth/me` возвращает 200 с валидными данными пользователя. Это классический race condition между Vue Router navigation guard и асинхронной проверкой авторизации.

---

## Root Cause

### Локализация проблемы

**Файл:** `src/router/guards.ts`, строки 12-16  
**Уровень уверенности:** HIGH

```typescript
// Wait for auth check if not initialized
if (!authStore.isInitialized) {
  await authStore.checkAuth();  // ← Проблема 1: возвращается мгновенно, если isLoading = true
}

const isAuthenticated = authStore.isAuthenticated;  // ← Проблема 2: читает состояние до завершения API
```

### Механизм race condition

1. **Инициализация приложения** (`src/main.ts`):
   - Приложение создаётся, Pinia и Router регистрируются
   - Router начинает обрабатывать навигацию на `/`
   - `AppWrapper.vue` монтируется и вызывает `checkAuth()` в `onMounted`

2. **Конкурирующие вызовы**:
   - `AppWrapper.vue` вызывает `checkAuth()` → устанавливает `isLoading = true` → начинает API запрос
   - Router guard тоже вызывает `await authStore.checkAuth()`
   - НО: `checkAuth()` имеет early return: `if (this.isLoading) return;`
   - Guard получает `undefined` мгновенно и продолжает выполнение

3. **Преждевременное решение**:
   - Guard читает `isAuthenticated` (который ещё `false`, т.к. API не завершился)
   - Guard решает: `requiresAuth && !isAuthenticated` → редирект на `/login`
   - Через 50-200мс API возвращает данные пользователя — но уже поздно

### Критический код

**`src/stores/authStore.ts`, строки 20-21:**
```typescript
async checkAuth() {
  if (this.isLoading) return;  // ← CRITICAL: немедленный возврат без ожидания
```

**`src/main.ts`, строки 7-12:**
```typescript
const app = createApp(AppWrapper);
const pinia = createPinia();
app.use(pinia);
app.use(router);  // ← Router активируется ДО проверки auth
app.mount('#app');
```

---

## Consilium Findings

### Architect (Code Tracer)

**Ключевые находки:**
- Race condition между `beforeEach` guard и `onMounted` в AppWrapper
- Миграция на Pinia (commit `f88d3ad`) убрала `.value` доступ, что изменило timing в guard
- Нет барьера инициализации — router активен до гарантированного состояния auth
- Pinia getter `isAuthenticated` работает в компонентах, но timing нарушается в guard

**Консенсус с Stack Expert:** Полный

### Stack Expert (Framework Analysis)

**Ключевые находки:**
- Guard использует устаревший паттерн Vue Router 3 (`next()` callback) вместо Vue Router 4 (return)
- Guard проверяет только `isInitialized`, но НЕ ждёт `isLoading === false`
- Bootstrap timing: `checkAuth()` вызывается в `onMounted`, а не до регистрации router
- Pinia 2.3.1 + Vue Router 4.2.0 совместимы, но код использует устаревшие паттерны

**Консенсус с Architect:** Полный

### Итоговый консенсус

Оба subagent согласны:
- **Root cause:** Race condition в `src/router/guards.ts`
- **Проблема:** Guard не ждёт завершения API запроса
- **Решение:** Инициализировать auth ДО регистрации router

---

## Reproduction Results

**Статус:** ✅ БАГ УСПЕШНО ВОСПРОИЗВЕДЁН

| Шаг | Действие | Результат |
|-----|----------|-----------|
| 1 | Навигация без cookie | Редирект на `/login` (ожидаемо) |
| 2 | Получение валидной SESSION_ID через curl | 200 OK, user data |
| 3 | Установка cookie в браузер | Cookie установлен |
| 4 | Навигация на `/` | ❌ Редирект на `/login?redirect=/` |

**Доказательство:**
- `/api/auth/me` → 200 OK с данными пользователя
- Но URL показывает `/login?redirect=/`
- Console errors: нет (API успешен)

---

## Affected Files

| Файл | Роль | Изменение |
|------|------|-----------|
| `src/router/guards.ts` | Navigation guard | **Главный источник бага** — нужна переработка |
| `src/stores/authStore.ts` | Auth state store | Добавить Promise tracking для pending запросов |
| `src/main.ts` | App bootstrap | Инициализировать auth ДО router |
| `src/AppWrapper.vue` | Root component | Убрать дублирующий `checkAuth()` |

---

## Fix Plan

### Шаг 1: Добавить Promise tracking в authStore

**Файл:** `src/stores/authStore.ts`

```typescript
state: () => ({
  user: null as User | null,
  isLoading: false,
  isInitialized: false,
  sessionExpired: false,
  _authPromise: null as Promise<void> | null,  // NEW
}),

actions: {
  async checkAuth() {
    // Если уже загружается — вернуть существующий Promise
    if (this._authPromise) {
      return this._authPromise;
    }
    
    this._authPromise = this._doCheckAuth();
    return this._authPromise;
  },
  
  async _doCheckAuth() {
    this.isLoading = true;
    try {
      const user = await authService.getCurrentUser();
      this.user = user;
      this.sessionExpired = false;
    } catch (error) {
      this.user = null;
    } finally {
      this.isLoading = false;
      this.isInitialized = true;
      this._authPromise = null;
    }
  },
}
```

### Шаг 2: Инициализировать auth до router

**Файл:** `src/main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import AppWrapper from './AppWrapper.vue';
import router from './router';
import { useAuthStore } from './stores/authStore';

const app = createApp(AppWrapper);
const pinia = createPinia();

app.use(pinia);

// CRITICAL: Инициализировать auth ДО router
const authStore = useAuthStore();
authStore.checkAuth().then(() => {
  app.use(router);
  app.mount('#app');
});
```

### Шаг 3: Обновить guard на Vue Router 4 паттерн

**Файл:** `src/router/guards.ts`

```typescript
import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

export async function authGuard(to: RouteLocationNormalized) {
  const authStore = useAuthStore();

  // Ждём завершения auth проверки (Promise tracking)
  if (!authStore.isInitialized) {
    await authStore.checkAuth();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthRoute = to.path === '/login';

  if (requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  } else if (isAuthRoute && isAuthenticated) {
    return { path: '/' };
  }
  // return undefined для продолжения навигации
}
```

### Шаг 4: Убрать дублирующий вызов в AppWrapper

**Файл:** `src/AppWrapper.vue`

```typescript
onMounted(async () => {
  initializeTheme();
  initNetworkStatus();
  // Убрать: await checkAuth(); — теперь это делается в main.ts
});
```

---

## Testing Strategy

### 1. Ручное тестирование

1. Открыть приложение без cookie → должен показать `/login`
2. Войти через demo → должен показать главную страницу
3. Перезагрузить страницу → должен остаться на главной (НЕ редирект на login)
4. Открыть новую вкладку с `/` → должен показать главную
5. Удалить cookie → перезагрузить → должен показать `/login`

### 2. Автоматические тесты

```typescript
// test/router/guards.spec.ts
describe('authGuard', () => {
  it('should wait for auth check before making redirect decision', async () => {
    // Mock slow API response
    vi.spyOn(authService, 'getCurrentUser').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockUser), 100))
    );
    
    const result = await authGuard(toRoute, fromRoute);
    
    // Should NOT redirect if auth check returns valid user
    expect(result).toBeUndefined();
  });
  
  it('should redirect to login when user is not authenticated', async () => {
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(null);
    
    const result = await authGuard(protectedRoute, fromRoute);
    
    expect(result).toEqual({ path: '/login', query: { redirect: '/' } });
  });
});
```

### 3. E2E тест (Playwright)

```typescript
test('should not redirect authenticated user to login', async ({ page }) => {
  // Получить valid session
  const response = await page.request.post('/api/auth/demo');
  const cookies = response.headers()['set-cookie'];
  
  // Установить cookie
  await page.context().addCookies([{
    name: 'SESSION_ID',
    value: extractSessionId(cookies),
    url: baseUrl
  }]);
  
  // Навигация на главную
  await page.goto('/');
  
  // Должен остаться на главной, НЕ редирект на login
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
});
```

---

## Risk Assessment

### Потенциальные проблемы

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Увеличение времени загрузки | Низкая | Auth check ~50-100ms, незаметно для пользователя |
| Broken existing flows | Средняя | Тщательное тестирование всех auth сценариев |
| Loading state flicker | Низкая | AppWrapper уже показывает loading spinner |

### Обратная совместимость

- API не меняется
- Pinia store интерфейс остаётся прежним
- Router routes не меняются
- Только внутренняя логика инициализации

### Что может сломаться

1. **Тесты, которые мокают authStore** — нужно обновить моки для `_authPromise`
2. **Deep links** — должны работать, т.к. auth инициализируется до router
3. **SSR (если используется)** — нужно проверить серверный рендеринг

---

## Заключение

Это классический race condition в SPA приложениях. Баг возник из-за:

1. Отсутствия гарантированного порядка инициализации (auth vs router)
2. Early return в `checkAuth()` при `isLoading === true`
3. Использования устаревшего паттерна Vue Router 3

Исправление требует:
1. Promise tracking для предотвращения дублирующих вызовов
2. Инициализации auth ДО регистрации router
3. Обновления guard на Vue Router 4 паттерн

Риск регрессии низкий при правильном тестировании.
