# F-f72aaaa1: Добавление поддержки тёмной темы

## Краткое описание

Завершение реализации переключения тёмной темы в приложении NoteBox. Инфраструктура для темы уже существует (useTheme.ts, AppearanceSection.vue, миграция БД), но 13 компонентов используют `@media (prefers-color-scheme: dark)` вместо класса `.dark`, из-за чего они не реагируют на переключатель темы в приложении.

## Текущее состояние

### Что уже реализовано:
- `tailwind.config.js` настроен с `darkMode: 'class'`
- `useTheme.ts` composable с режимами light/dark/system
- CSS-переменные для цветов определены в `style.css` (--bg-primary, --text-primary и т.д.)
- Переключатель темы в MainView.vue (кнопка в сайдбаре)
- Миграция БД `V002__add_theme_preference_to_users.sql` для хранения предпочтений
- `AppearanceSection.vue` в настройках для выбора темы
- 18 файлов уже корректно используют `dark:` классы Tailwind (126 вхождений)

### Что требует исправления:
13 компонентов используют `@media (prefers-color-scheme: dark)` вместо селектора `.dark`:

1. `src/views/LoginView.vue`
2. `src/components/auth/DemoButton.vue`
3. `src/components/auth/OAuthButton.vue`
4. `src/components/common/SessionExpiredModal.vue`
5. `src/components/layout/DemoBanner.vue`
6. `src/components/settings/AppearanceSection.vue`
7. `src/components/settings/AvatarUpload.vue`
8. `src/components/settings/NotificationsSection.vue`
9. `src/components/settings/ProfileSection.vue`
10. `src/components/settings/SettingsModal.vue`
11. `src/components/settings/SettingsSidebar.vue`
12. `src/AppWrapper.vue`
13. `src/components/BlockEditor/CreateNestedNoteModal.vue`

## Требования (на основе анализа кодовой базы)

### Функциональные требования:
1. Все компоненты должны реагировать на переключатель темы в приложении
2. Поддержка трёх режимов: светлая, тёмная, системная
3. Сохранение предпочтений пользователя в localStorage и на сервере
4. Плавные переходы при смене темы (уже реализовано в style.css)

### Технические требования:
1. Использовать селектор `.dark` вместо `@media (prefers-color-scheme: dark)`
2. Предпочтительно использовать `dark:` классы Tailwind
3. Для сложных компонентов с scoped CSS - использовать селектор `:global(.dark) .component`
4. Сохранить существующую цветовую схему

### Ограничения деплоя:
- Приложение развёртывается на subpath `/<project-slug>/`
- За nginx reverse proxy через HTTP (не HTTPS)
- Cookie без флага Secure

## Файлы для модификации

### Высокий приоритет (видимые при входе):
| Файл | Тип изменений |
|------|---------------|
| `src/views/LoginView.vue` | Заменить `@media (prefers-color-scheme: dark)` на `.dark` |
| `src/components/auth/OAuthButton.vue` | Заменить `@media` на `.dark` |
| `src/components/auth/DemoButton.vue` | Заменить `@media` на `.dark` |

### Средний приоритет (настройки и модальные окна):
| Файл | Тип изменений |
|------|---------------|
| `src/components/settings/SettingsModal.vue` | Заменить `@media` на `.dark` |
| `src/components/settings/SettingsSidebar.vue` | Заменить `@media` на `.dark` |
| `src/components/settings/AppearanceSection.vue` | Заменить `@media` на `.dark` |
| `src/components/settings/ProfileSection.vue` | Заменить `@media` на `.dark` |
| `src/components/settings/NotificationsSection.vue` | Заменить `@media` на `.dark` |
| `src/components/settings/AvatarUpload.vue` | Заменить `@media` на `.dark` |

### Низкий приоритет:
| Файл | Тип изменений |
|------|---------------|
| `src/components/common/SessionExpiredModal.vue` | Заменить `@media` на `.dark` |
| `src/components/layout/DemoBanner.vue` | Заменить `@media` на `.dark` |
| `src/components/BlockEditor/CreateNestedNoteModal.vue` | Заменить `@media` на `.dark` |
| `src/AppWrapper.vue` | Заменить `@media` на `.dark` |

## Подход к реализации

### Шаг 1: Конвертация CSS медиа-запросов в селекторы класса

Для каждого компонента заменить:
```css
/* Было */
@media (prefers-color-scheme: dark) {
  .component {
    background: #1f1f1f;
  }
}

/* Стало - вариант A: через :global для scoped стилей */
:global(.dark) .component {
  background: #1f1f1f;
}

/* Стало - вариант B: через Tailwind классы в template */
<div class="bg-white dark:bg-gray-800">
```

### Шаг 2: Тестирование переключения

1. Проверить переключение темы через кнопку в сайдбаре
2. Проверить переключение через настройки (AppearanceSection)
3. Проверить режим "системная тема"
4. Проверить сохранение предпочтений после перезагрузки

### Шаг 3: Проверка всех экранов

1. Страница входа (LoginView)
2. Главный экран (MainView)
3. Модальное окно настроек
4. Модальное окно создания вложенной заметки
5. Баннер демо-режима
6. Модальное окно истечения сессии

## Критерии приёмки

1. [ ] Все 13 компонентов реагируют на переключатель темы
2. [ ] Плавный переход при смене темы (уже есть transition в style.css)
3. [ ] Режим "системная тема" корректно отслеживает изменения ОС
4. [ ] Предпочтения сохраняются в localStorage
5. [ ] Предпочтения синхронизируются с сервером (если пользователь авторизован)
6. [ ] Нет "вспышки" неправильной темы при загрузке страницы
7. [ ] Все тексты читаемы в обоих темах (контраст)

## Граничные случаи и риски

### Граничные случаи:
- Пользователь меняет системную тему ОС при выбранном режиме "системная"
- localStorage недоступен (приватный режим браузера)
- Первый вход пользователя без сохранённых предпочтений
- Авторизованный пользователь заходит с нового устройства (предпочтения на сервере)

### Риски:
- **Низкий:** Возможные проблемы с :global() в scoped стилях Vue
  - *Митигация:* Тестировать каждый компонент после изменения
- **Низкий:** Несогласованность цветов между компонентами
  - *Митигация:* Использовать CSS-переменные из style.css

## Вне скоупа

- Добавление новых цветовых тем (только light/dark/system)
- Кастомизация цветов пользователем
- Анимации иконок при смене темы
- Превью темы перед применением
- Отдельные темы для редактора кода (если будет добавлен)

## Примечания

Интервью с заказчиком не проведено (бэкенд недоступен). Спецификация составлена на основе:
1. Анализа существующей кодовой базы
2. Изучения уже реализованной инфраструктуры темы
3. Лучших практик для dark mode в Vue + Tailwind
4. Скриншота `08-dark-theme.png` в корне репозитория
