# Модалка настроек по клику на профиль пользователя

## Summary

Заменить текущую простую модалку профиля (`ProfileModal.vue`) на полноценную модалку настроек в стиле Notion. Модалка открывается по клику на аватар/имя пользователя в сайдбаре и содержит разделы: Профиль, Внешний вид, Уведомления (заглушка), Выход.

## Требования (собраны в ходе интервью)

### Layout и дизайн
- **Структура**: Notion-style модалка с двумя колонками
  - Слева: меню навигации с разделами
  - Справа: контент выбранного раздела
- **Размер**: Фиксированный (~700x500px), на мобильных устройствах - fullscreen
- **Закрытие**: Все способы - клик вне модалки, кнопка X, клавиша Escape
- **Анимации**: Плавные (fade-in/out для модалки, плавная смена контента между разделами)

### Разделы модалки

#### 1. Профиль
- Отображение и редактирование имени пользователя
- Отображение email (только чтение)
- Загрузка аватара через S3 (используя существующий `S3StorageService`)
- Отображение текущего аватара с возможностью замены

#### 2. Внешний вид
- Выбор темы: три кнопки-карточки (Light / Dark / System)
- Использовать существующий `useTheme.ts` composable
- Синхронизация темы с сервером (сохранение в профиле пользователя)

#### 3. Уведомления
- Заглушка с текстом "Скоро" или пустой раздел
- Подготовка UI для будущей функциональности

#### 4. Выход из аккаунта
- Кнопка выхода (без подтверждения)
- Редирект на страницу логина (`/login`) после выхода

### Обработка ошибок
- Показывать ошибки при неудачном сохранении (имя, аватар, тема)
- Валидация имени не требуется

## Файлы для изменения/создания

### Frontend (Vue 3 + TypeScript)

#### Создать:
1. `src/components/settings/SettingsModal.vue` - главный компонент модалки
2. `src/components/settings/SettingsSidebar.vue` - боковое меню разделов
3. `src/components/settings/ProfileSection.vue` - раздел профиля
4. `src/components/settings/AppearanceSection.vue` - раздел внешнего вида
5. `src/components/settings/NotificationsSection.vue` - заглушка уведомлений
6. `src/components/settings/AvatarUpload.vue` - компонент загрузки аватара
7. `src/api/user.ts` - API для обновления профиля пользователя

#### Изменить:
1. `src/components/auth/UserProfile.vue` - триггер открытия SettingsModal вместо ProfileModal
2. `src/components/Sidebar.vue` или `src/components/UnifiedSidebar.vue` - интеграция с новой модалкой
3. `src/composables/useTheme.ts` - добавить функцию `setTheme(mode)` для явной установки темы
4. `src/stores/authStore.ts` - добавить действие обновления профиля
5. `src/services/auth/types.ts` - расширить тип User (если нужно поле themePreference)

#### Удалить:
1. `src/components/auth/ProfileModal.vue` - заменяется на SettingsModal

### Backend (Kotlin/Spring Boot)

#### Создать:
1. `server/src/main/kotlin/com/notebox/dto/UpdateUserDto.kt` - DTO для обновления профиля
2. `server/src/main/kotlin/com/notebox/domain/auth/UserPreferences.kt` - модель настроек (если нужна отдельная)

#### Изменить:
1. `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` - добавить endpoint `PATCH /api/users/me`
2. `server/src/main/kotlin/com/notebox/domain/auth/UserService.kt` - добавить метод обновления профиля
3. `server/src/main/kotlin/com/notebox/domain/auth/UsersTable.kt` - добавить поле `theme_preference` (если нет)
4. `server/src/main/kotlin/com/notebox/domain/auth/User.kt` - добавить поле themePreference
5. Миграция БД для нового поля theme_preference

## Детальный план реализации

### Этап 1: Backend API

1. Добавить поле `theme_preference` в таблицу users:
   ```sql
   ALTER TABLE users ADD COLUMN theme_preference VARCHAR(10) DEFAULT 'system';
   ```

2. Создать DTO для обновления профиля:
   ```kotlin
   data class UpdateUserDto(
       val name: String? = null,
       val avatarUrl: String? = null,
       val themePreference: String? = null // "light" | "dark" | "system"
   )
   ```

3. Добавить endpoint в AuthController:
   ```kotlin
   @PatchMapping("/api/users/me")
   fun updateCurrentUser(@RequestBody dto: UpdateUserDto): UserDto
   ```

4. Реализовать загрузку аватара (использовать существующий FileController или создать отдельный endpoint)

### Этап 2: Frontend - структура компонентов

1. Создать `SettingsModal.vue`:
   - Teleport to body
   - Overlay с затемнением
   - Обработка Escape и клика вне модалки
   - Transition для анимаций
   - Двухколоночный layout (sidebar + content)

2. Создать `SettingsSidebar.vue`:
   - Список пунктов меню с иконками
   - Активное состояние для текущего раздела
   - Emit события при выборе раздела

3. Создать секции для каждого раздела

### Этап 3: Frontend - функциональность

1. `ProfileSection.vue`:
   - Форма редактирования имени (input)
   - Компонент загрузки аватара
   - Кнопка сохранения
   - Отображение ошибок

2. `AppearanceSection.vue`:
   - Три кнопки-карточки для выбора темы
   - Визуальное выделение текущей темы
   - Немедленное применение при выборе

3. `AvatarUpload.vue`:
   - Drag-and-drop или клик для выбора файла
   - Preview перед загрузкой
   - Загрузка в S3 через существующий API
   - Индикатор загрузки

### Этап 4: Интеграция и тестирование

1. Обновить `useTheme.ts`:
   - Добавить `setTheme(mode: ThemeMode)`
   - Синхронизация с сервером при изменении

2. Интегрировать модалку в sidebar

3. Удалить старый `ProfileModal.vue`

## Acceptance Criteria

1. [ ] Клик на профиль пользователя в сайдбаре открывает модалку настроек
2. [ ] Модалка имеет боковое меню с разделами: Профиль, Внешний вид, Уведомления, Выход
3. [ ] Раздел "Профиль" позволяет:
   - [ ] Просматривать email
   - [ ] Редактировать имя
   - [ ] Загружать аватар
4. [ ] Раздел "Внешний вид" содержит три кнопки выбора темы (Light/Dark/System)
5. [ ] Выбор темы применяется немедленно и сохраняется на сервере
6. [ ] Раздел "Уведомления" показывает заглушку
7. [ ] Кнопка "Выход" выполняет logout и редиректит на /login
8. [ ] Модалка закрывается по:
   - [ ] Клику вне модалки
   - [ ] Кнопке X
   - [ ] Клавише Escape
9. [ ] Модалка имеет плавные анимации появления/исчезновения
10. [ ] Ошибки сохранения отображаются пользователю
11. [ ] На мобильных устройствах модалка занимает весь экран

## Edge Cases и риски

### Edge Cases
- Пользователь загружает очень большой файл аватара → ограничить размер (например, 5MB)
- Пользователь загружает не изображение → валидация MIME type
- Сетевая ошибка при сохранении → показать сообщение, не закрывать модалку
- Пользователь закрывает модалку с несохранёнными изменениями → изменения теряются (без подтверждения по требованию)

### Риски
- S3 может быть недоступен → graceful degradation, показать ошибку
- Длительная загрузка аватара → показать индикатор прогресса
- Конфликт тем (localStorage vs server) → сервер имеет приоритет при загрузке

## Out of Scope

- Настройки уведомлений (только заглушка)
- Изменение email
- Изменение пароля (OAuth-only аутентификация)
- Удаление аккаунта
- Двухфакторная аутентификация
- Настройки языка/локализации
- История входов/активные сессии
