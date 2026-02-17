# F-44c537da: OAuth Base Service

## Summary

Реализация базового OAuth сервиса для авторизации пользователей через внешних провайдеров (Google и Apple). Включает полный стек: фронтенд (Vue 3) и бэкенд (Spring Boot/Kotlin).

## Requirements (из интервью)

### OAuth провайдеры
- **Google** — OAuth 2.0 авторизация
- **Apple** — Sign in with Apple

### OAuth Flow
- **Redirect flow** — пользователь перенаправляется на страницу провайдера, затем обратно в приложение

### Хранение токенов и сессий
- OAuth токены хранятся **на сервере**, привязаны к сессии пользователя
- Идентификация пользователя: **Session ID в HttpOnly cookie**
- Хранение сессий: **PostgreSQL**

### UI/UX

#### Страница логина
- **Отдельная полноэкранная страница** с кнопками OAuth провайдеров
- **Стиль Notion**: поддержка тёмной/светлой темы, скруглённые элементы, приглушённые цвета

#### Профиль пользователя
- Расположение: **левая панель сверху** (как в Notion) — маленький аватар и имя
- Нажатие открывает **модальное окно профиля**
- Содержимое модалки: аватар, имя, email, кнопка выхода

#### Данные профиля от провайдеров
- Email
- Имя
- Аватар (URL)

### Поведение авторизации
- Неавторизованные пользователи: **редирект на страницу логина**
- Публичные маршруты: учесть возможность shared-заметок в будущем (пока не реализовывать)

### Истечение сессии
- При истечении сессии: **модальное окно** с предложением войти заново (без потери состояния страницы)

---

## Files to Create/Modify

### Backend (Kotlin/Spring Boot)

#### Новые файлы

```
server/src/main/kotlin/com/notebox/
├── config/
│   └── SecurityConfig.kt              # Spring Security конфигурация
├── domain/
│   └── auth/
│       ├── AuthController.kt          # Эндпоинты авторизации
│       ├── OAuthService.kt            # Базовый OAuth сервис
│       ├── GoogleOAuthProvider.kt     # Google провайдер
│       ├── AppleOAuthProvider.kt      # Apple провайдер
│       ├── OAuthProvider.kt           # Интерфейс провайдера
│       ├── SessionService.kt          # Управление сессиями
│       ├── SessionRepository.kt       # Репозиторий сессий
│       ├── SessionsTable.kt           # Таблица сессий (Exposed)
│       ├── User.kt                    # Модель пользователя
│       ├── UserService.kt             # Сервис пользователей
│       ├── UserRepository.kt          # Репозиторий пользователей
│       └── UsersTable.kt              # Таблица пользователей (Exposed)
└── dto/
    ├── UserDto.kt                     # DTO пользователя
    └── AuthDto.kt                     # DTO авторизации
```

#### Модификации

- `server/build.gradle.kts` — добавить зависимости Spring Security OAuth2
- `server/src/main/resources/application.yml` — конфигурация OAuth провайдеров

### Frontend (Vue 3/TypeScript)

#### Новые файлы

```
src/
├── views/
│   └── LoginView.vue                  # Страница логина
├── components/
│   ├── auth/
│   │   ├── OAuthButton.vue            # Кнопка OAuth провайдера
│   │   ├── UserProfile.vue            # Блок профиля в сайдбаре
│   │   └── ProfileModal.vue           # Модальное окно профиля
│   └── common/
│       └── SessionExpiredModal.vue    # Модалка истечения сессии
├── services/
│   └── auth/
│       ├── authService.ts             # Сервис авторизации
│       ├── oauthService.ts            # OAuth логика
│       └── types.ts                   # Типы авторизации
├── composables/
│   └── useAuth.ts                     # Composable для авторизации
├── stores/
│   └── authStore.ts                   # Стор состояния авторизации
└── router/
    ├── index.ts                       # Роутер (новый файл)
    └── guards.ts                      # Гарды авторизации
```

#### Модификации

- `src/App.vue` — добавить router-view и проверку авторизации
- `src/main.ts` — подключить роутер
- `src/api/client.ts` — добавить обработку 401 ошибок
- `package.json` — добавить vue-router

---

## Implementation Approach

### Phase 1: Backend Foundation

1. **Добавить зависимости Spring Security**
   ```kotlin
   implementation("org.springframework.boot:spring-boot-starter-security")
   implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
   implementation("org.springframework.session:spring-session-jdbc")
   ```

2. **Создать таблицы в PostgreSQL**
   - `users` — id, email, name, avatar_url, created_at, updated_at
   - `user_oauth_accounts` — id, user_id, provider, provider_user_id, access_token, refresh_token, expires_at
   - `spring_session` — стандартная таблица Spring Session

3. **Реализовать OAuthService**
   - Абстрактный класс/интерфейс `OAuthProvider`
   - Конкретные реализации для Google и Apple
   - Методы: `getAuthorizationUrl()`, `exchangeCode()`, `getUserInfo()`

4. **Настроить SecurityConfig**
   - Защита всех эндпоинтов кроме `/api/auth/**`
   - Настройка CORS для фронтенда
   - Session management через JDBC

### Phase 2: Backend OAuth Flow

1. **Эндпоинты авторизации**
   - `GET /api/auth/login/{provider}` — редирект на страницу провайдера
   - `GET /api/auth/callback/{provider}` — обработка callback от провайдера
   - `POST /api/auth/logout` — выход из системы
   - `GET /api/auth/me` — получение текущего пользователя

2. **Логика callback**
   - Обмен code на токены
   - Получение профиля пользователя
   - Создание/обновление пользователя в БД
   - Создание сессии
   - Редирект на фронтенд

### Phase 3: Frontend Foundation

1. **Установить и настроить vue-router**
   - Роут `/login` — страница логина
   - Роут `/` — основное приложение
   - Роут `/auth/callback` — обработка редиректа от OAuth

2. **Создать authStore (Pinia или reactive state)**
   - Состояние: `user`, `isAuthenticated`, `isLoading`
   - Actions: `checkAuth()`, `logout()`

3. **Реализовать auth guard**
   - Проверка авторизации перед переходом на защищённые роуты
   - Редирект на `/login` если не авторизован

### Phase 4: Frontend UI

1. **LoginView**
   - Центрированная карточка с логотипом
   - Кнопки "Continue with Google" и "Continue with Apple"
   - Поддержка тёмной/светлой темы

2. **UserProfile компонент**
   - Аватар + имя (сокращённое если длинное)
   - Hover эффект
   - Клик открывает ProfileModal

3. **ProfileModal**
   - Аватар (большой)
   - Имя и email
   - Кнопка "Выйти"

4. **SessionExpiredModal**
   - Текст "Сессия истекла"
   - Кнопка "Войти заново"

### Phase 5: Integration

1. **Интеграция apiClient**
   - Interceptor для обработки 401
   - Показ SessionExpiredModal при истечении сессии

2. **Интеграция с существующим UI**
   - Добавить UserProfile в левую панель
   - Обернуть приложение в auth check

---

## Acceptance Criteria

### Функциональные

- [ ] Пользователь может войти через Google
- [ ] Пользователь может войти через Apple
- [ ] После успешного входа пользователь видит своё имя и аватар в левой панели
- [ ] Клик по профилю открывает модальное окно с информацией
- [ ] Пользователь может выйти из системы
- [ ] Неавторизованный пользователь перенаправляется на страницу логина
- [ ] При истечении сессии показывается модальное окно без потери состояния

### Технические

- [ ] OAuth токены хранятся на сервере, не передаются на фронтенд
- [ ] Session ID передаётся через HttpOnly cookie
- [ ] Сессии сохраняются в PostgreSQL
- [ ] Spring Security корректно защищает API эндпоинты
- [ ] UI поддерживает тёмную и светлую темы

---

## Edge Cases and Risks

### Edge Cases

1. **Пользователь отменяет авторизацию** — показать сообщение об ошибке на странице логина
2. **OAuth провайдер недоступен** — показать ошибку с возможностью повторить
3. **Email уже зарегистрирован через другого провайдера** — связать аккаунты по email (один пользователь может иметь несколько OAuth аккаунтов)
4. **Пользователь удалил аккаунт у провайдера** — обработать ошибку при обновлении токена
5. **Несколько вкладок** — сессия должна работать во всех вкладках

### Risks

1. **Apple Sign In сложнее в реализации** — требует верификации домена и настройки Service ID
2. **CORS и cookies** — внимательно настроить `SameSite` и `Secure` атрибуты для production
3. **Rate limits OAuth провайдеров** — кэшировать токены, не запрашивать userinfo при каждом запросе

---

## Out of Scope

- Авторизация по email/password
- Регистрация без OAuth
- Управление привязанными OAuth аккаунтами (добавление/удаление провайдеров)
- Публичные (shared) заметки для неавторизованных пользователей
- Двухфакторная аутентификация
- Восстановление пароля
- Верификация email

---

## API Contract

### Endpoints

```
GET  /api/auth/login/{provider}     → Redirect to OAuth provider
GET  /api/auth/callback/{provider}  → Handle OAuth callback, redirect to frontend
POST /api/auth/logout               → Invalidate session
GET  /api/auth/me                   → Get current user info
```

### Response DTOs

```typescript
// GET /api/auth/me
interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

// Error response (401)
interface AuthErrorDto {
  code: "UNAUTHORIZED" | "SESSION_EXPIRED";
  message: string;
}
```

---

## Database Schema

### users

| Column      | Type         | Notes                |
|-------------|--------------|----------------------|
| id          | UUID         | Primary key          |
| email       | VARCHAR(255) | Unique, not null     |
| name        | VARCHAR(255) | Not null             |
| avatar_url  | TEXT         | Nullable             |
| created_at  | TIMESTAMP    | Default now()        |
| updated_at  | TIMESTAMP    | Default now()        |

### user_oauth_accounts

| Column           | Type         | Notes                          |
|------------------|--------------|--------------------------------|
| id               | UUID         | Primary key                    |
| user_id          | UUID         | FK → users.id                  |
| provider         | VARCHAR(50)  | 'google' / 'apple'             |
| provider_user_id | VARCHAR(255) | ID пользователя у провайдера   |
| access_token     | TEXT         | Encrypted                      |
| refresh_token    | TEXT         | Encrypted, nullable            |
| expires_at       | TIMESTAMP    | Nullable                       |
| created_at       | TIMESTAMP    | Default now()                  |
| updated_at       | TIMESTAMP    | Default now()                  |

**Unique constraint**: (provider, provider_user_id)
**Index**: (user_id)
