# Диагностический отчёт: Session expired stuck in login

## Bug Summary

При истечении сессии пользователь видит модальное окно "Сессия истекла" с кнопкой "Войти заново", но нажатие на кнопку не закрывает модальное окно, блокируя доступ к странице логина.

## Root Cause

**Основная причина:** Функция `handleLogin()` в `SessionExpiredModal.vue` (строка 32-34) выполняет только `router.push('/login')`, но не сбрасывает флаг `sessionExpired` в authStore.

**Файл:** `src/components/common/SessionExpiredModal.vue:32-34`

```typescript
function handleLogin() {
  router.push('/login');
}
```

**Проблема:** Модальное окно отображается когда `authStore.sessionExpired === true`. При нажатии кнопки "Войти заново":
1. Выполняется переход на `/login`
2. Флаг `sessionExpired` остаётся `true`
3. Модальное окно остаётся открытым (Teleport to body с z-index: 1000)
4. Модальное окно блокирует взаимодействие со страницей логина

## Analysis

### Поток воспроизведения бага

1. Пользователь работает с приложением (демо или обычная сессия)
2. Сессия истекает на сервере
3. При следующем API-запросе сервер возвращает 401 с кодом `SESSION_EXPIRED`
4. `apiClient.ts:34-36` обрабатывает ошибку:
   ```typescript
   if (errorCode === 'SESSION_EXPIRED') {
     authStore.setSessionExpired(true);
   }
   ```
5. `authStore.setSessionExpired(true)` устанавливает:
   - `state.sessionExpired = true`
   - `state.user = null`
6. `AppWrapper.vue` показывает `SessionExpiredModal` (is-open привязан к sessionExpired)
7. Пользователь нажимает "Войти заново"
8. `handleLogin()` вызывает `router.push('/login')` **без сброса sessionExpired**
9. Модальное окно остаётся видимым и блокирует UI

### Почему checkAuth не помогает

В `guards.ts:10-12`:
```typescript
if (!authStore.isInitialized.value) {
  await authStore.checkAuth();
}
```

При навигации на `/login` guard проверяет `isInitialized`, который уже `true` после первой инициализации. Поэтому `checkAuth()` не вызывается повторно и `sessionExpired` не сбрасывается.

### Связанные файлы с логикой sessionExpired

| Файл | Роль |
|------|------|
| `src/stores/authStore.ts:77-81` | Определение `setSessionExpired()` |
| `src/api/client.ts:33-37` | Установка `sessionExpired = true` при 401 |
| `src/components/common/SessionExpiredModal.vue` | UI модального окна |
| `src/AppWrapper.vue:3` | Рендеринг модального окна |

## Affected Files

1. **`src/components/common/SessionExpiredModal.vue`** - основной файл для исправления
2. **`src/stores/authStore.ts`** - возможно, добавить метод для полного сброса состояния при переходе на логин

## Fix Plan

### Вариант 1: Минимальное исправление (рекомендуется)

**Файл:** `src/components/common/SessionExpiredModal.vue`

Изменить функцию `handleLogin()`:

```typescript
import { useRouter } from 'vue-router';
import { authStore } from '../../stores/authStore';

function handleLogin() {
  authStore.setSessionExpired(false);
  router.push('/login');
}
```

### Вариант 2: Альтернативное решение через emit

Добавить emit события и обрабатывать его в родительском компоненте:

**SessionExpiredModal.vue:**
```typescript
const emit = defineEmits<{
  (e: 'login'): void;
}>();

function handleLogin() {
  emit('login');
}
```

**AppWrapper.vue:**
```html
<SessionExpiredModal
  :is-open="sessionExpired"
  @login="handleSessionLogin"
/>
```

```typescript
function handleSessionLogin() {
  authStore.setSessionExpired(false);
  router.push('/login');
}
```

### Рекомендация

**Вариант 1** предпочтительнее, так как:
- Минимальные изменения
- Логика инкапсулирована в одном месте
- Не требует изменений в родительском компоненте

## Testing Strategy

### Ручное тестирование

1. **Сценарий воспроизведения:**
   - Войти через демо-режим
   - Дождаться истечения сессии (или симулировать через DevTools)
   - Убедиться, что показывается модальное окно "Сессия истекла"
   - Нажать "Войти заново"
   - **Ожидаемый результат:** Модальное окно закрывается, открывается страница логина

2. **Проверка повторного входа:**
   - После перехода на страницу логина выполнить вход
   - Убедиться, что модальное окно не появляется снова
   - Убедиться, что приложение работает корректно

3. **Проверка прямого перехода на корневую страницу:**
   - После истечения сессии открыть `/` напрямую
   - Должен произойти редирект на `/login` без модального окна

### Автоматизированное тестирование

Добавить unit-тест для `SessionExpiredModal`:

```typescript
describe('SessionExpiredModal', () => {
  it('should reset sessionExpired and navigate to login on button click', async () => {
    // Setup
    authStore.setSessionExpired(true);

    // Simulate button click
    await handleLogin();

    // Assert
    expect(authStore.sessionExpired.value).toBe(false);
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
```

## Risk Assessment

### Низкий риск

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Изменение влияет на другие компоненты | Низкая | `setSessionExpired(false)` уже используется в `checkAuth()` и `logout()` |
| Состояние гонки при навигации | Низкая | Vue Router обрабатывает асинхронность корректно |
| Регрессия в других сценариях logout | Низкая | Логика logout не затрагивается |

### Проверить после исправления

1. Обычный logout работает корректно
2. OAuth flow работает без изменений
3. Демо-режим работает без изменений
4. Переход на защищённые страницы без авторизации редиректит на login

## Summary

Баг вызван отсутствием сброса флага `sessionExpired` при нажатии кнопки "Войти заново" в модальном окне истёкшей сессии. Исправление требует добавления одной строки кода: `authStore.setSessionExpired(false)` перед `router.push('/login')`.
