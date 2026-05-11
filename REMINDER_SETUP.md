# Настройка системы напоминаний

## Требования

Для работы системы напоминаний необходимо настроить следующие компоненты:

### 1. VAPID ключи для Push-уведомлений

Генерация VAPID ключей:

```bash
npx web-push generate-vapid-keys
```

Полученные ключи добавьте в environment variables:

```bash
VAPID_PUBLIC_KEY=<ваш публичный ключ>
VAPID_PRIVATE_KEY=<ваш приватный ключ>
VAPID_SUBJECT=mailto:admin@notebox.app
```

### 2. Google Calendar API

Для синхронизации с Google Calendar необходимо:

1. Обновить OAuth scopes в Google Cloud Console:
   - Добавьте scope: `https://www.googleapis.com/auth/calendar.events`

2. Пересоздать OAuth consent screen если необходимо

3. Пользователям потребуется переавторизоваться через Google для получения новых разрешений

### 3. Зависимости

Backend зависимости уже добавлены в `server/build.gradle.kts`:
- `nl.martijndwars:web-push:5.1.1` - для Web Push
- `org.bouncycastle:bcprov-jdk15on:1.70` - криптография для Web Push
- `com.google.api-client:google-api-client:2.2.0` - Google API клиент
- `com.google.apis:google-api-services-calendar:v3-rev20230825-2.0.0` - Google Calendar API

### 4. База данных

При первом запуске автоматически создадутся таблицы:
- `reminders` - напоминания
- `push_subscriptions` - подписки на push-уведомления

### 5. Service Worker

Service Worker (`public/sw.js`) будет автоматически зарегистрирован при загрузке приложения.

**Важно:** Service Worker работает только:
- На HTTPS (в продакшене)
- На localhost (для разработки)

### 6. Иконки для уведомлений

Замените placeholder файлы на реальные иконки:
- `public/icon-192.png` - иконка 192x192 пикселей
- `public/badge-72.png` - badge 72x72 пикселей

## Конфигурация сервера

Добавьте в `application.yml` или environment variables:

```yaml
push:
  vapid:
    public-key: ${VAPID_PUBLIC_KEY}
    private-key: ${VAPID_PRIVATE_KEY}
    subject: ${VAPID_SUBJECT:mailto:admin@notebox.app}

oauth:
  google:
    client-id: ${GOOGLE_CLIENT_ID}
    client-secret: ${GOOGLE_CLIENT_SECRET}
```

## Использование

### Для пользователей

1. **Создание напоминания:**
   - Открыть заметку
   - Нажать кнопку 🔔 в toolbar или использовать команду `/remind`
   - Указать дату, время и настройки повторения
   - Опционально включить синхронизацию с Google Calendar

2. **Настройка уведомлений:**
   - Перейти в Settings → Notifications
   - Разрешить push-уведомления в браузере
   - Подключить Google Calendar (если нужно)

3. **Получение уведомлений:**
   - Browser push-уведомления приходят автоматически
   - Клик по уведомлению открывает связанную заметку

### Для разработчиков

#### API Endpoints

**Reminders:**
- `GET /api/reminders` - получить все напоминания
- `GET /api/reminders/{id}` - получить напоминание по ID
- `GET /api/reminders/note/{noteId}` - получить напоминания для заметки
- `GET /api/reminders/upcoming?limit=10` - получить предстоящие напоминания
- `POST /api/reminders` - создать напоминание
- `PUT /api/reminders/{id}` - обновить напоминание
- `DELETE /api/reminders/{id}` - удалить напоминание

**Notifications:**
- `GET /api/notifications/vapid-public-key` - получить VAPID публичный ключ
- `GET /api/notifications/subscriptions` - получить подписки пользователя
- `POST /api/notifications/subscribe` - подписаться на уведомления
- `POST /api/notifications/unsubscribe` - отписаться от уведомлений

**Calendar:**
- `GET /api/calendar/google/status` - проверить статус подключения Google Calendar

## Troubleshooting

### Push-уведомления не работают

1. Проверьте, что VAPID ключи правильно настроены
2. Убедитесь, что приложение работает через HTTPS (или localhost)
3. Проверьте разрешения браузера на уведомления
4. Проверьте логи Service Worker в DevTools → Application → Service Workers

### Google Calendar не синхронизируется

1. Проверьте, что OAuth scopes включают `calendar.events`
2. Пользователь должен переавторизоваться если scopes были обновлены
3. Проверьте Google Cloud Console квоты API
4. Проверьте логи сервера на наличие ошибок API

### Напоминания не отправляются

1. Проверьте, что Spring Scheduler включен (`@EnableScheduling`)
2. Проверьте логи scheduler'а (каждую минуту должна быть запись)
3. Убедитесь, что время сервера правильное (UTC)
4. Проверьте, что у пользователя есть активная push-подписка

## Архитектура

### Backend

- **ReminderScheduler** - выполняется каждую минуту, проверяет напоминания
- **PushNotificationService** - отправляет Web Push уведомления
- **GoogleCalendarService** - синхронизирует события с Google Calendar
- **ReminderService** - бизнес-логика напоминаний

### Frontend

- **useReminders** - composable для работы с API напоминаний
- **usePushNotifications** - управление push-подписками
- **useCalendarSync** - проверка статуса календаря
- **ReminderModal** - UI создания/редактирования
- **Service Worker** - обработка push-уведомлений в фоне

## Безопасность

- VAPID ключи должны храниться в секретах, не коммититься в репозиторий
- Push-подписки привязаны к userId, нельзя отправлять уведомления другим пользователям
- Google Calendar токены обновляются автоматически через OAuth refresh token
- Все API endpoints требуют аутентификации

## Производительность

- Scheduler выполняется каждую минуту - легкая операция
- Push-уведомления отправляются асинхронно
- Google Calendar API вызовы кешируются
- Индексы на `remind_at` и `notification_sent` для быстрых запросов
