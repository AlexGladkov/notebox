# F-702decb6: Роли и управление доступом

## Статус
**DRAFT** — требуется уточнение требований от пользователя

## Краткое описание
Реализация системы ролей и управления доступом для NoteBox, позволяющей назначать различные роли пользователям и управлять доступом к папкам и заметкам на уровне ролей и отдельных пользователей.

## Исходное описание задачи
> As user i want to add different roles for my account with per-role access and per-user access to folders and notes

## Текущее состояние системы

### Архитектура
- **Backend:** Kotlin + Spring Boot (Exposed ORM)
- **Frontend:** Vue 3 + TypeScript + TipTap
- **Основные сущности:** Folder, Note, CustomDatabase, Record

### Отсутствующие компоненты
- Система аутентификации (нет пользователей)
- Система авторизации (нет ролей и прав)
- Управление сессиями

## Требования (предполагаемые)

> ⚠️ **ВАЖНО:** Интервью с пользователем не было завершено из-за таймаута. Ниже представлены предполагаемые требования, которые необходимо подтвердить.

### Функциональные требования

#### 1. Аутентификация пользователей
- [ ] Регистрация пользователей (email/пароль)
- [ ] Вход в систему
- [ ] Выход из системы
- [ ] Восстановление пароля

#### 2. Роли
Предполагаемые роли:
- **Owner** — полный доступ, может управлять ролями и пользователями
- **Admin** — управление папками и заметками, без управления пользователями
- **Editor** — создание и редактирование контента
- **Viewer** — только просмотр

#### 3. Доступ к ресурсам
- [ ] Доступ на уровне ролей (Role-based access)
- [ ] Доступ на уровне пользователей (User-based access)
- [ ] Наследование прав от родительской папки

#### 4. Права доступа
- **Read** — просмотр содержимого
- **Write** — создание и редактирование
- **Delete** — удаление
- **Share** — управление доступом к ресурсу

### Нефункциональные требования
- Безопасное хранение паролей (bcrypt/argon2)
- JWT токены для сессий
- HTTPS для защиты данных

## Вопросы для уточнения

1. **Аутентификация:** Нужна ли полноценная система аутентификации или роли будут назначаться вручную?

2. **Роли:** Какие конкретно роли необходимы? Стандартный набор (Owner/Admin/Editor/Viewer) или кастомные роли?

3. **Область действия:** Роли глобальные или можно назначать разные роли для разных папок?

4. **Приглашения:** Как пользователи будут добавляться? Приглашения по email, ссылки для регистрации?

5. **UI:** Где должен находиться интерфейс управления доступом? Отдельная страница настроек, контекстное меню папки/заметки?

6. **Владелец:** Может ли быть несколько владельцев? Можно ли передать владение?

7. **Доступ к заметкам:** Доступ только через папки или можно расшарить отдельную заметку?

8. **Публичный доступ:** Нужна ли возможность публичного (анонимного) доступа к контенту?

## Предполагаемые файлы для изменения

### Backend (новые файлы)
- `server/src/main/kotlin/com/notebox/domain/user/User.kt`
- `server/src/main/kotlin/com/notebox/domain/user/UsersTable.kt`
- `server/src/main/kotlin/com/notebox/domain/user/UserRepository.kt`
- `server/src/main/kotlin/com/notebox/domain/user/UserService.kt`
- `server/src/main/kotlin/com/notebox/domain/user/UserController.kt`
- `server/src/main/kotlin/com/notebox/domain/role/Role.kt`
- `server/src/main/kotlin/com/notebox/domain/role/RolesTable.kt`
- `server/src/main/kotlin/com/notebox/domain/role/RoleService.kt`
- `server/src/main/kotlin/com/notebox/domain/access/Permission.kt`
- `server/src/main/kotlin/com/notebox/domain/access/PermissionsTable.kt`
- `server/src/main/kotlin/com/notebox/domain/access/AccessService.kt`
- `server/src/main/kotlin/com/notebox/domain/access/AccessController.kt`
- `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`
- `server/src/main/kotlin/com/notebox/auth/JwtService.kt`
- `server/src/main/kotlin/com/notebox/auth/AuthController.kt`

### Backend (изменения)
- `server/src/main/kotlin/com/notebox/domain/folder/FolderService.kt` — проверка прав
- `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` — проверка прав
- `server/src/main/kotlin/com/notebox/config/DatabaseConfig.kt` — новые таблицы

### Frontend (новые файлы)
- `src/pages/LoginPage.vue`
- `src/pages/RegisterPage.vue`
- `src/pages/SettingsPage.vue`
- `src/components/access/ShareDialog.vue`
- `src/components/access/RoleSelector.vue`
- `src/components/access/UserList.vue`
- `src/composables/useAuth.ts`
- `src/composables/useAccess.ts`
- `src/api/auth.ts`
- `src/api/access.ts`
- `src/types/auth.ts`

### Frontend (изменения)
- `src/main.ts` — роутинг, guards
- `src/App.vue` — layout с учётом авторизации

## Примерная схема базы данных

```sql
-- Пользователи
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Роли
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    permissions JSONB, -- массив разрешений
    created_at TIMESTAMP
);

-- Связь пользователей и ролей
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Права доступа к ресурсам
CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY,
    resource_type VARCHAR(20) NOT NULL, -- 'folder' | 'note'
    resource_id UUID NOT NULL,
    principal_type VARCHAR(20) NOT NULL, -- 'user' | 'role'
    principal_id UUID NOT NULL,
    permission VARCHAR(20) NOT NULL, -- 'read' | 'write' | 'delete' | 'share'
    created_at TIMESTAMP,
    UNIQUE(resource_type, resource_id, principal_type, principal_id, permission)
);
```

## Критерии приёмки

> ⚠️ Требуют уточнения после интервью

1. [ ] Пользователи могут регистрироваться и входить в систему
2. [ ] Администратор может создавать роли
3. [ ] Пользователям можно назначать роли
4. [ ] Папки и заметки можно расшаривать с ролями и пользователями
5. [ ] Права доступа корректно проверяются на бэкенде
6. [ ] UI отображает только доступный контент
7. [ ] UI позволяет управлять доступом к папкам/заметкам

## Риски и ограничения

1. **Scope creep** — система авторизации может значительно расширить scope задачи
2. **Миграция данных** — существующие папки и заметки нужно привязать к владельцу
3. **Производительность** — проверка прав на каждый запрос может замедлить систему
4. **Сложность UI** — интерфейс управления доступом требует тщательной проработки

## Вне scope (предположительно)

- OAuth/социальные сети для входа
- Двухфакторная аутентификация
- Аудит логов доступа
- Групповые политики
- API для интеграций

## Следующие шаги

1. **Завершить интервью** — получить ответы на вопросы выше
2. **Определить MVP** — минимальный набор функций для первой версии
3. **Детализировать реализацию** — после уточнения требований

---

*Документ создан: 2026-02-16*
*Статус: Требуется доработка*
