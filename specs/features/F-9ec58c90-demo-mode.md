# F-9ec58c90: Demo Mode (Демо-режим)

## Summary

Добавление демо-режима в приложение NoteBox, позволяющего пользователям попробовать функционал без регистрации через OAuth. Демо-вход реализуется как третья кнопка на странице логина (рядом с Google и Apple), которая мгновенно авторизует пользователя под общим демо-аккаунтом.

## Requirements (Собранные требования)

### Управление функцией
- **Feature flag**: Демо-режим управляется через конфигурацию (application.yml/properties)
- Переменная: `demo.mode.enabled=true/false`
- Можно включать/выключать без деплоя (через конфигурацию окружения)

### Модель демо-пользователя
- **Один общий демо-пользователь** на все демо-сессии
- Все демо-сессии видят и редактируют одни и те же данные
- **Полный доступ** без ограничений (создание, редактирование, удаление — всё разрешено)
- **Пустой аккаунт** изначально (без предзаполненных демо-данных)

### Данные демо-пользователя
- Имя: `Demo User`
- Email: `demo@notebox.app`
- Демо-пользователь создаётся при первом входе (если не существует)

### UI/UX
- **Кнопка на странице логина**: В стиле OAuth кнопок (Google, Apple), третья в ряду
- Иконка: специальная иконка "демо" (play/sandbox)
- Текст кнопки: "Войти в демо"
- **Баннер демо-режима**: Яркая плашка сверху страницы после входа
- Текст баннера: "Демо-режим — данные общие для всех"
- Кнопка выхода в баннере или стандартный logout

### Сессия
- **Длительность**: Сессия браузера (до закрытия вкладки/браузера)
- Реализация: Cookie без maxAge или session storage
- При закрытии браузера — автоматический выход

### Изоляция
- **Без привязки к реальному аккаунту** — демо-сессия полностью изолирована
- Созданные данные остаются на демо-аккаунте
- При регистрации через Google/Apple — новый пустой аккаунт

## Files to Create/Modify

### Backend (Kotlin/Spring)

#### Новые файлы:
1. `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`
   - Сервис для создания/получения демо-пользователя и сессии

#### Модификации:
1. `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt`
   - Добавить endpoint `POST /api/auth/demo` для демо-входа
   - Возвращает сессионную cookie (без maxAge для session cookie)

2. `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`
   - Разрешить endpoint `/api/auth/demo` без авторизации

3. `server/src/main/resources/application.yml`
   - Добавить `demo.mode.enabled: ${DEMO_MODE_ENABLED:false}`

4. `server/src/main/kotlin/com/notebox/domain/auth/UserService.kt` (или UserRepository)
   - Метод для создания/получения демо-пользователя по фиксированному email

### Frontend (Vue 3)

#### Новые файлы:
1. `src/components/auth/DemoButton.vue`
   - Кнопка демо-входа в стиле OAuthButton

2. `src/components/layout/DemoBanner.vue`
   - Баннер демо-режима для отображения сверху страницы

#### Модификации:
1. `src/views/LoginView.vue`
   - Добавить DemoButton под OAuth кнопками
   - Показывать кнопку только если демо-режим включён (из конфига)

2. `src/services/auth/oauthService.ts` (или новый demoService.ts)
   - Метод `loginDemo()` — вызов `POST /api/auth/demo`

3. `src/composables/useAuth.ts`
   - Добавить флаг `isDemoUser` в состояние аутентификации

4. `src/App.vue` или layout компонент
   - Показывать DemoBanner если пользователь — демо

5. `src/services/config.ts` или аналог
   - Получение флага `demoModeEnabled` с бэкенда или из env

## Implementation Approach

### Phase 1: Backend

1. **Добавить конфигурацию demo mode**
   ```yaml
   demo:
     mode:
       enabled: ${DEMO_MODE_ENABLED:false}
   ```

2. **Создать DemoAuthProvider**
   - Проверяет, включён ли demo mode
   - Создаёт или получает демо-пользователя (email: demo@notebox.app)
   - Создаёт сессию для демо-пользователя

3. **Добавить endpoint в AuthController**
   ```kotlin
   @PostMapping("/demo")
   fun loginDemo(response: HttpServletResponse): ResponseEntity<ApiResponse<*>>
   ```
   - Проверить что demo mode включён
   - Получить/создать демо-пользователя
   - Создать session cookie (без maxAge — session cookie)
   - Вернуть user info

4. **Обновить SecurityConfig**
   - Разрешить `/api/auth/demo` без авторизации

5. **Добавить endpoint для получения конфигурации**
   ```kotlin
   @GetMapping("/config")
   fun getConfig(): ResponseEntity<Map<String, Any>>
   ```
   - Возвращает `{ demoModeEnabled: true/false }`

### Phase 2: Frontend

1. **Создать DemoButton компонент**
   - Стиль как у OAuthButton
   - Иконка play/sandbox
   - Текст: "Войти в демо"

2. **Добавить кнопку на LoginView**
   - Показывать только если `demoModeEnabled`
   - Обработчик вызывает `authService.loginDemo()`

3. **Создать DemoBanner компонент**
   - Фиксированный баннер сверху
   - Жёлтый/оранжевый цвет для привлечения внимания
   - Текст: "Демо-режим — данные общие для всех"
   - Кнопка "Выйти" или ссылка на регистрацию

4. **Обновить useAuth composable**
   - Добавить `isDemoUser` computed на основе email пользователя

5. **Показывать баннер в App.vue**
   - Если `isDemoUser` — отображать DemoBanner

## Acceptance Criteria

1. [ ] Feature flag `demo.mode.enabled` управляет отображением кнопки демо-входа
2. [ ] Кнопка "Войти в демо" отображается на странице логина (если включено)
3. [ ] Клик по кнопке мгновенно авторизует пользователя (без редиректов)
4. [ ] После входа пользователь видит баннер "Демо-режим"
5. [ ] Демо-пользователь имеет полный доступ ко всем функциям
6. [ ] Сессия демо-пользователя — session cookie (истекает при закрытии браузера)
7. [ ] Все демо-сессии работают с одним общим аккаунтом (demo@notebox.app)
8. [ ] При выключенном feature flag кнопка демо не отображается
9. [ ] Endpoint `/api/auth/demo` возвращает 403 если demo mode выключен

## Edge Cases and Risks

### Edge Cases
1. **Одновременные демо-сессии**: Несколько пользователей могут редактировать одни данные
   - Риск: Конфликты при редактировании
   - Решение: Это ожидаемое поведение, баннер предупреждает что данные общие

2. **Демо-пользователь удалён из БД**: При первом входе пользователь создаётся заново

3. **Demo mode включён в production**: Риск злоупотребления общим аккаунтом
   - Mitigation: Feature flag позволяет быстро отключить

4. **Данные демо-аккаунта "замусорены"**: Со временем может накопиться много данных
   - Решение: Периодическая ручная очистка или scheduled job (вне scope)

### Security Considerations
- Endpoint `/api/auth/demo` защищён проверкой feature flag
- Демо-сессия использует стандартные механизмы безопасности (HttpOnly, Secure cookies)
- Демо-пользователь не может быть использован для OAuth linking (нет OAuth accounts)

## Out of Scope

Следующие функции явно исключены из текущей реализации:

1. ❌ Привязка демо-аккаунта к реальному (перенос данных)
2. ❌ Изолированные демо-сессии (каждый в своём sandbox)
3. ❌ Предзаполненные демо-данные
4. ❌ Автоматический сброс демо-данных
5. ❌ Ограничения функционала для демо-пользователя (read-only, etc.)
6. ❌ Лимит по времени демо-сессии (кроме session cookie)
7. ❌ Rate limiting для демо-входа

## Technical Notes

### Session Cookie без maxAge
Для реализации "сессии браузера" нужно создавать cookie без установки maxAge:
```kotlin
val cookie = Cookie(SESSION_COOKIE_NAME, session.id).apply {
    isHttpOnly = true
    secure = true
    path = "/"
    // НЕ устанавливать maxAge — это создаст session cookie
}
```

### Идентификация демо-пользователя
На фронтенде определяем демо-пользователя по email:
```typescript
const isDemoUser = computed(() => user.value?.email === 'demo@notebox.app')
```

### Config Endpoint
Для передачи флага на фронтенд можно использовать:
- Отдельный endpoint `/api/config`
- Включить в ответ `/api/auth/me`
- Environment variable для фронтенда (требует rebuild)

Рекомендация: endpoint `/api/config` — гибкость без rebuild.
