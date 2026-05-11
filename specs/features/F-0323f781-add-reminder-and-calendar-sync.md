# F-0323f781: Reminder System with Calendar Sync

## Summary

Реализация системы напоминаний для заметок с push-уведомлениями и интеграцией с календарями (Google Calendar). Позволяет превращать заметки в actionable items с дедлайнами, получать уведомления о напоминаниях и синхронизировать их с внешними календарями.

## Requirements

### Собранные требования

Интервью с пользователем не было проведено (MCP бэкенд недоступен). Требования основаны на описании задачи и анализе существующей кодовой базы:

1. **Напоминания для заметок**: Возможность добавить напоминание к любой заметке с указанием даты/времени
2. **Push-уведомления**: Браузерные уведомления (Web Push API) при наступлении времени напоминания
3. **Интеграция с Google Calendar**: Синхронизация напоминаний с Google Calendar
4. **Apple Calendar**: Экспорт напоминаний в формате iCal (.ics) для импорта в Apple Calendar
5. **UI для создания напоминаний**: Slash-команда `/remind` и кнопка в интерфейсе заметки
6. **Управление напоминаниями**: Просмотр, редактирование и удаление напоминаний

### Анализ существующей реализации

**Что уже есть:**
- `server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt` — OAuth с Google
- `src/components/settings/NotificationsSection.vue` — заглушка для настроек уведомлений
- `src/components/BlockEditor/SlashCommandMenu.vue` — slash-команды в редакторе
- Существующая структура Note с createdAt/updatedAt
- API клиент и паттерны взаимодействия frontend-backend

**Что нужно добавить:**
- Модель Reminder на бэкенде с CRUD API
- Push notification инфраструктура (VAPID keys, Service Worker)
- Google Calendar API интеграция
- Frontend компоненты для UI напоминаний
- Scheduled job для отправки уведомлений

## Files to Create/Modify

### Backend — Новые файлы

1. **`server/src/main/kotlin/com/notebox/domain/reminder/Reminder.kt`**
   - Data class для модели напоминания
   
2. **`server/src/main/kotlin/com/notebox/domain/reminder/RemindersTable.kt`**
   - Exposed table definition для хранения напоминаний

3. **`server/src/main/kotlin/com/notebox/domain/reminder/ReminderRepository.kt`**
   - Repository для CRUD операций с напоминаниями

4. **`server/src/main/kotlin/com/notebox/domain/reminder/ReminderService.kt`**
   - Business logic для напоминаний

5. **`server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt`**
   - REST API endpoints для напоминаний

6. **`server/src/main/kotlin/com/notebox/domain/reminder/ReminderScheduler.kt`**
   - Scheduled job для проверки и отправки уведомлений

7. **`server/src/main/kotlin/com/notebox/domain/notification/PushNotificationService.kt`**
   - Web Push API интеграция

8. **`server/src/main/kotlin/com/notebox/domain/notification/PushSubscription.kt`**
   - Модель для хранения push-подписок

9. **`server/src/main/kotlin/com/notebox/domain/notification/PushSubscriptionsTable.kt`**
   - Таблица для push-подписок

10. **`server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt`**
    - API для управления push-подписками

11. **`server/src/main/kotlin/com/notebox/domain/calendar/GoogleCalendarService.kt`**
    - Интеграция с Google Calendar API

12. **`server/src/main/kotlin/com/notebox/domain/calendar/CalendarController.kt`**
    - API для синхронизации с календарями

### Frontend — Новые файлы

1. **`src/api/reminders.ts`**
   - API клиент для напоминаний

2. **`src/api/notifications.ts`**
   - API клиент для push-подписок

3. **`src/api/calendar.ts`**
   - API клиент для календарной интеграции

4. **`src/types/reminder.ts`**
   - TypeScript типы для напоминаний

5. **`src/composables/useReminders.ts`**
   - Composable для работы с напоминаниями

6. **`src/composables/usePushNotifications.ts`**
   - Composable для Web Push API

7. **`src/composables/useCalendarSync.ts`**
   - Composable для синхронизации с календарями

8. **`src/components/reminder/ReminderModal.vue`**
   - Модальное окно создания/редактирования напоминания

9. **`src/components/reminder/ReminderBadge.vue`**
   - Индикатор напоминания на заметке

10. **`src/components/reminder/ReminderList.vue`**
    - Список всех напоминаний пользователя

11. **`src/components/reminder/DateTimePicker.vue`**
    - Компонент выбора даты и времени

12. **`public/sw.js`**
    - Service Worker для push-уведомлений

### Модифицируемые файлы

1. **`server/src/main/kotlin/com/notebox/config/DatabaseConfig.kt`**
   - Добавить создание таблиц Reminders и PushSubscriptions

2. **`server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt`**
   - Расширить scopes для Google Calendar API

3. **`src/components/BlockEditor.vue`**
   - Добавить slash-команду /remind

4. **`src/components/NoteEditor.vue`**
   - Добавить кнопку напоминания в toolbar
   - Показывать ReminderBadge если есть напоминание

5. **`src/components/settings/NotificationsSection.vue`**
   - Реализовать настройки уведомлений

6. **`src/App.vue`**
   - Регистрация Service Worker

7. **`src/components/Sidebar.vue`**
   - Добавить пункт "Напоминания" в меню

## Implementation Approach

### Phase 1: Модель данных и базовый API напоминаний

```kotlin
// server/src/main/kotlin/com/notebox/domain/reminder/Reminder.kt
package com.notebox.domain.reminder

import java.time.Instant

data class Reminder(
    val id: String,
    val noteId: String,
    val userId: String,
    val title: String,           // из названия заметки или кастомный
    val remindAt: Instant,       // дата/время напоминания
    val repeatType: RepeatType,  // NONE, DAILY, WEEKLY, MONTHLY, YEARLY
    val repeatEndAt: Instant?,   // конец повторений
    val notificationSent: Boolean,
    val googleEventId: String?,  // ID события в Google Calendar
    val createdAt: Instant,
    val updatedAt: Instant
)

enum class RepeatType {
    NONE, DAILY, WEEKLY, MONTHLY, YEARLY
}
```

```kotlin
// server/src/main/kotlin/com/notebox/domain/reminder/RemindersTable.kt
package com.notebox.domain.reminder

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

object RemindersTable : Table("reminders") {
    val id = varchar("id", 36)
    val noteId = varchar("note_id", 36)
    val userId = varchar("user_id", 36)
    val title = varchar("title", 500)
    val remindAt = timestamp("remind_at")
    val repeatType = varchar("repeat_type", 20).default("NONE")
    val repeatEndAt = timestamp("repeat_end_at").nullable()
    val notificationSent = bool("notification_sent").default(false)
    val googleEventId = varchar("google_event_id", 255).nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    
    override val primaryKey = PrimaryKey(id)
}
```

### Phase 2: Push Notification инфраструктура

```kotlin
// server/src/main/kotlin/com/notebox/domain/notification/PushSubscription.kt
package com.notebox.domain.notification

data class PushSubscription(
    val id: String,
    val userId: String,
    val endpoint: String,
    val p256dh: String,
    val auth: String,
    val createdAt: java.time.Instant
)
```

```kotlin
// server/src/main/kotlin/com/notebox/domain/notification/PushNotificationService.kt
package com.notebox.domain.notification

import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class PushNotificationService(
    @Value("\${push.vapid.public-key}") private val publicKey: String,
    @Value("\${push.vapid.private-key}") private val privateKey: String,
    @Value("\${push.vapid.subject}") private val subject: String,
    private val subscriptionRepository: PushSubscriptionRepository
) {
    private val pushService = PushService(publicKey, privateKey, subject)
    
    suspend fun sendNotification(userId: String, title: String, body: String, url: String) {
        val subscriptions = subscriptionRepository.getByUserId(userId)
        
        val payload = """
            {
                "title": "$title",
                "body": "$body",
                "url": "$url"
            }
        """.trimIndent()
        
        subscriptions.forEach { sub ->
            try {
                val notification = Notification(sub.endpoint, sub.p256dh, sub.auth, payload)
                pushService.send(notification)
            } catch (e: Exception) {
                // Удалить недействительную подписку
                if (e.message?.contains("410") == true) {
                    subscriptionRepository.delete(sub.id)
                }
            }
        }
    }
}
```

### Phase 3: Scheduler для отправки уведомлений

```kotlin
// server/src/main/kotlin/com/notebox/domain/reminder/ReminderScheduler.kt
package com.notebox.domain.reminder

import com.notebox.domain.notification.PushNotificationService
import kotlinx.coroutines.runBlocking
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class ReminderScheduler(
    private val reminderRepository: ReminderRepository,
    private val pushNotificationService: PushNotificationService
) {
    @Scheduled(fixedRate = 60000) // каждую минуту
    fun checkReminders() = runBlocking {
        val now = Instant.now()
        val dueReminders = reminderRepository.getDueReminders(now)
        
        dueReminders.forEach { reminder ->
            // Отправить push-уведомление
            pushNotificationService.sendNotification(
                userId = reminder.userId,
                title = "Напоминание",
                body = reminder.title,
                url = "/notes/${reminder.noteId}"
            )
            
            // Обработать повторение или отметить как отправленное
            if (reminder.repeatType != RepeatType.NONE) {
                val nextRemindAt = calculateNextRemindAt(reminder)
                if (nextRemindAt != null && (reminder.repeatEndAt == null || nextRemindAt.isBefore(reminder.repeatEndAt))) {
                    reminderRepository.updateRemindAt(reminder.id, nextRemindAt)
                } else {
                    reminderRepository.markAsSent(reminder.id)
                }
            } else {
                reminderRepository.markAsSent(reminder.id)
            }
        }
    }
    
    private fun calculateNextRemindAt(reminder: Reminder): Instant? {
        return when (reminder.repeatType) {
            RepeatType.DAILY -> reminder.remindAt.plusSeconds(86400)
            RepeatType.WEEKLY -> reminder.remindAt.plusSeconds(604800)
            RepeatType.MONTHLY -> reminder.remindAt.plusSeconds(2592000)
            RepeatType.YEARLY -> reminder.remindAt.plusSeconds(31536000)
            else -> null
        }
    }
}
```

### Phase 4: Google Calendar интеграция

```kotlin
// server/src/main/kotlin/com/notebox/domain/calendar/GoogleCalendarService.kt
package com.notebox.domain.calendar

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.calendar.Calendar
import com.google.api.services.calendar.model.Event
import com.google.api.services.calendar.model.EventDateTime
import com.google.auth.http.HttpCredentialsAdapter
import com.google.auth.oauth2.AccessToken
import com.google.auth.oauth2.GoogleCredentials
import com.notebox.domain.auth.UserOAuthAccountRepository
import com.notebox.domain.reminder.Reminder
import org.springframework.stereotype.Service
import java.util.Date

@Service
class GoogleCalendarService(
    private val oauthAccountRepository: UserOAuthAccountRepository
) {
    fun createEvent(userId: String, reminder: Reminder): String? {
        val account = oauthAccountRepository.getByUserIdAndProvider(userId, "google")
            ?: return null
        
        val calendar = getCalendarService(account.accessToken)
        
        val event = Event().apply {
            summary = reminder.title
            description = "Напоминание из NoteBox"
            start = EventDateTime().setDateTime(
                com.google.api.client.util.DateTime(Date.from(reminder.remindAt))
            )
            end = EventDateTime().setDateTime(
                com.google.api.client.util.DateTime(Date.from(reminder.remindAt.plusSeconds(3600)))
            )
        }
        
        val createdEvent = calendar.events()
            .insert("primary", event)
            .execute()
        
        return createdEvent.id
    }
    
    fun deleteEvent(userId: String, googleEventId: String) {
        val account = oauthAccountRepository.getByUserIdAndProvider(userId, "google")
            ?: return
        
        val calendar = getCalendarService(account.accessToken)
        calendar.events().delete("primary", googleEventId).execute()
    }
    
    private fun getCalendarService(accessToken: String): Calendar {
        val credentials = GoogleCredentials.create(AccessToken(accessToken, null))
        val httpTransport = GoogleNetHttpTransport.newTrustedTransport()
        
        return Calendar.Builder(
            httpTransport,
            GsonFactory.getDefaultInstance(),
            HttpCredentialsAdapter(credentials)
        )
            .setApplicationName("NoteBox")
            .build()
    }
}
```

### Phase 5: Frontend — API и типы

```typescript
// src/types/reminder.ts
export type RepeatType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Reminder {
  id: string;
  noteId: string;
  title: string;
  remindAt: number; // timestamp
  repeatType: RepeatType;
  repeatEndAt?: number;
  notificationSent: boolean;
  googleEventId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateReminderRequest {
  noteId: string;
  title?: string;
  remindAt: number;
  repeatType?: RepeatType;
  repeatEndAt?: number;
  syncToGoogleCalendar?: boolean;
}

export interface UpdateReminderRequest {
  title?: string;
  remindAt?: number;
  repeatType?: RepeatType;
  repeatEndAt?: number;
}
```

```typescript
// src/api/reminders.ts
import { apiClient } from './client';
import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '../types/reminder';

export const remindersApi = {
  async getAll(): Promise<Reminder[]> {
    return apiClient.get<Reminder[]>('/api/reminders');
  },

  async getByNoteId(noteId: string): Promise<Reminder[]> {
    return apiClient.get<Reminder[]>(`/api/reminders/note/${noteId}`);
  },

  async create(request: CreateReminderRequest): Promise<Reminder> {
    return apiClient.post<Reminder>('/api/reminders', request);
  },

  async update(id: string, request: UpdateReminderRequest): Promise<Reminder> {
    return apiClient.put<Reminder>(`/api/reminders/${id}`, request);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/reminders/${id}`);
  },

  async getUpcoming(limit: number = 10): Promise<Reminder[]> {
    return apiClient.get<Reminder[]>(`/api/reminders/upcoming?limit=${limit}`);
  },
};
```

### Phase 6: Frontend — Компоненты

```vue
<!-- src/components/reminder/ReminderModal.vue -->
<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="reminder-modal">
      <div class="modal-header">
        <h2>{{ isEditing ? 'Редактировать напоминание' : 'Новое напоминание' }}</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Название</label>
          <input v-model="form.title" type="text" placeholder="Название напоминания" />
        </div>
        
        <div class="form-group">
          <label>Дата и время</label>
          <DateTimePicker v-model="form.remindAt" />
        </div>
        
        <div class="form-group">
          <label>Повторение</label>
          <select v-model="form.repeatType">
            <option value="NONE">Не повторять</option>
            <option value="DAILY">Ежедневно</option>
            <option value="WEEKLY">Еженедельно</option>
            <option value="MONTHLY">Ежемесячно</option>
            <option value="YEARLY">Ежегодно</option>
          </select>
        </div>
        
        <div v-if="form.repeatType !== 'NONE'" class="form-group">
          <label>Повторять до</label>
          <DateTimePicker v-model="form.repeatEndAt" :optional="true" />
        </div>
        
        <div v-if="hasGoogleCalendar" class="form-group checkbox">
          <label>
            <input v-model="form.syncToGoogleCalendar" type="checkbox" />
            Добавить в Google Calendar
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="close">Отмена</button>
        <button class="btn-primary" @click="save" :disabled="!isValid">
          {{ isEditing ? 'Сохранить' : 'Создать' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- src/components/reminder/ReminderBadge.vue -->
<template>
  <div v-if="reminder" class="reminder-badge" :class="{ overdue: isOverdue }">
    <span class="reminder-icon">🔔</span>
    <span class="reminder-time">{{ formattedTime }}</span>
    <button class="edit-btn" @click.stop="$emit('edit', reminder)">
      <span>✏️</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Reminder } from '../../types/reminder';

const props = defineProps<{
  reminder: Reminder | null;
}>();

defineEmits<{
  edit: [reminder: Reminder];
}>();

const isOverdue = computed(() => {
  if (!props.reminder) return false;
  return props.reminder.remindAt < Date.now() && !props.reminder.notificationSent;
});

const formattedTime = computed(() => {
  if (!props.reminder) return '';
  const date = new Date(props.reminder.remindAt);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>
```

### Phase 7: Service Worker для Push

```javascript
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Напоминание из NoteBox',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'NoteBox', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

### Phase 8: Slash-команда /remind

```typescript
// Добавить в slashCommands (BlockEditor.vue)
{
  id: 'remind',
  title: 'Напоминание',
  description: 'Добавить напоминание к заметке',
  icon: '🔔',
  category: 'Действия',
  keywords: ['remind', 'reminder', 'напоминание', 'deadline', 'дедлайн'],
  command: (editor: Editor) => {
    // Открыть модал создания напоминания
    emit('openReminderModal');
  },
}
```

## Acceptance Criteria

### Напоминания
- [ ] Создание напоминания через slash-команду /remind
- [ ] Создание напоминания через кнопку в toolbar заметки
- [ ] Выбор даты и времени напоминания
- [ ] Настройка повторений (ежедневно, еженедельно, ежемесячно, ежегодно)
- [ ] Редактирование существующего напоминания
- [ ] Удаление напоминания
- [ ] Отображение badge напоминания на заметке

### Push-уведомления
- [ ] Запрос разрешения на уведомления при первом создании напоминания
- [ ] Получение push-уведомления в браузере при наступлении времени
- [ ] Клик по уведомлению открывает связанную заметку
- [ ] Работа уведомлений когда браузер закрыт (но Service Worker активен)

### Google Calendar
- [ ] Опция синхронизации напоминания с Google Calendar
- [ ] Создание события в Google Calendar при создании напоминания
- [ ] Удаление события из Google Calendar при удалении напоминания
- [ ] Расширение OAuth scopes для Calendar API

### Настройки уведомлений
- [ ] Включение/выключение push-уведомлений
- [ ] Включение/выключение автосинхронизации с Google Calendar
- [ ] Статус подключения к Google Calendar

### UI/UX
- [ ] Список всех напоминаний в sidebar
- [ ] Фильтрация напоминаний (сегодня, неделя, все)
- [ ] Индикация просроченных напоминаний
- [ ] Поддержка тёмной темы
- [ ] Responsive дизайн

## Edge Cases and Risks

### Edge Cases

1. **Пользователь не дал разрешение на уведомления**
   - Решение: Показать информативное сообщение, предложить включить в настройках браузера

2. **Google Calendar токен истёк**
   - Решение: Использовать refresh token для обновления, если не удалось — показать сообщение о необходимости переавторизации

3. **Напоминание на прошедшую дату**
   - Решение: Показать предупреждение, но разрешить создание

4. **Множественные устройства пользователя**
   - Решение: Хранить push-подписки для каждого устройства, отправлять на все

5. **Пользователь удаляет заметку с напоминанием**
   - Решение: Каскадное удаление напоминаний при удалении заметки

6. **Сервер недоступен в момент напоминания (offline)**
   - Решение: Проверять пропущенные напоминания при восстановлении связи

7. **Часовые пояса**
   - Решение: Хранить время в UTC, конвертировать на клиенте

8. **Повторяющееся напоминание без конечной даты**
   - Решение: Ограничить максимум 1 год или 100 повторений

### Risks

1. **Производительность scheduler при большом количестве напоминаний**
   - Митигация: Индексы на remind_at и notification_sent, batch processing

2. **Лимиты Google Calendar API**
   - Митигация: Rate limiting, retry with exponential backoff

3. **VAPID ключи в конфигурации**
   - Митигация: Хранить в environment variables, не коммитить

4. **Service Worker не поддерживается в старых браузерах**
   - Митигация: Feature detection, fallback на in-app уведомления

5. **HTTP deployment без HTTPS**
   - Митигация: Service Worker требует HTTPS в продакшене, но работает на localhost для разработки. В deployment за nginx proxy добавить X-Forwarded-Proto header

## Out of Scope

1. **Интеграция с Apple Calendar API** — только экспорт .ics файла
2. **Email уведомления** — только push-уведомления в браузере
3. **SMS уведомления** — выходит за рамки веб-приложения
4. **Напоминания для конкретных блоков внутри заметки** — только для всей заметки
5. **Shared напоминания для командной работы** — только личные напоминания
6. **Интеграция с другими календарями (Outlook, Yahoo)** — только Google Calendar
7. **Умные предложения времени** — только ручной ввод
8. **Location-based напоминания** — только time-based

## Technical Notes

### База данных

Новые таблицы:
- `reminders` — напоминания
- `push_subscriptions` — подписки на push-уведомления

### Зависимости Backend

```kotlin
// build.gradle.kts — добавить
implementation("nl.martijndwars:web-push:5.1.1")
implementation("com.google.api-client:google-api-client:2.2.0")
implementation("com.google.apis:google-api-services-calendar:v3-rev20230825-2.0.0")
```

### Конфигурация

```yaml
# application.yml — добавить
push:
  vapid:
    public-key: ${VAPID_PUBLIC_KEY}
    private-key: ${VAPID_PRIVATE_KEY}
    subject: mailto:admin@notebox.app

oauth:
  google:
    # Добавить scope для Calendar API
    scopes: openid,email,profile,https://www.googleapis.com/auth/calendar.events
```

### Deployment Considerations

- Subpath routing: URL в push-уведомлениях должны учитывать base path
- HTTP: Service Worker не будет работать на plain HTTP (только localhost или HTTPS)
- Cookie Secure: не влияет на push-уведомления
- VAPID ключи: сгенерировать при деплое, хранить в secrets

### Генерация VAPID ключей

```bash
npx web-push generate-vapid-keys
```
