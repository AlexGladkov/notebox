<template>
  <div class="reminder-list">
    <div class="reminder-list-header">
      <h2>Напоминания</h2>
      <div class="filters">
        <button
          v-for="filter in filters"
          :key="filter.value"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
          class="filter-btn"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Загрузка напоминаний...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>Ошибка: {{ error }}</p>
      <button @click="refresh" class="retry-btn">Повторить</button>
    </div>

    <div v-else-if="filteredReminders.length === 0" class="empty">
      <div class="empty-icon">🔔</div>
      <p>Нет напоминаний</p>
      <p class="empty-hint">Создайте напоминание для заметки, чтобы не забыть о важных делах</p>
    </div>

    <div v-else class="reminders-container">
      <div
        v-for="reminder in filteredReminders"
        :key="reminder.id"
        class="reminder-item"
        :class="{ overdue: isOverdue(reminder) }"
      >
        <div class="reminder-content">
          <div class="reminder-title">{{ reminder.title }}</div>
          <div class="reminder-meta">
            <span class="reminder-time">
              {{ formatTime(reminder.remindAt) }}
            </span>
            <span v-if="reminder.repeatType !== 'NONE'" class="reminder-repeat">
              🔁 {{ formatRepeatType(reminder.repeatType) }}
            </span>
            <span v-if="reminder.googleEventId" class="reminder-synced" title="Синхронизировано с Google Calendar">
              📅
            </span>
          </div>
        </div>
        <div class="reminder-actions">
          <button
            @click="handleEdit(reminder)"
            class="action-btn edit"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            @click="handleDelete(reminder)"
            class="action-btn delete"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useReminders } from '../../composables/useReminders';
import type { Reminder } from '../../types/reminder';

const emit = defineEmits<{
  edit: [reminder: Reminder];
}>();

const { reminders, loading, error, fetchReminders, deleteReminder } = useReminders();

const filters = [
  { label: 'Все', value: 'all' },
  { label: 'Сегодня', value: 'today' },
  { label: 'Неделя', value: 'week' },
];

const currentFilter = ref('all');

const filteredReminders = computed(() => {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let filtered = reminders.value;

  if (currentFilter.value === 'today') {
    filtered = filtered.filter((r: Reminder) => {
      return r.remindAt >= today.getTime() && r.remindAt < todayEnd.getTime();
    });
  } else if (currentFilter.value === 'week') {
    filtered = filtered.filter((r: Reminder) => {
      return r.remindAt >= today.getTime() && r.remindAt < weekEnd.getTime();
    });
  }

  // Сортировка: сначала непросроченные (по возрастанию времени), затем просроченные
  return filtered.sort((a: Reminder, b: Reminder) => {
    const aOverdue = a.remindAt < now && !a.notificationSent;
    const bOverdue = b.remindAt < now && !b.notificationSent;

    if (aOverdue && !bOverdue) return 1;
    if (!aOverdue && bOverdue) return -1;

    return a.remindAt - b.remindAt;
  });
});

const isOverdue = (reminder: Reminder) => {
  return reminder.remindAt < Date.now() && !reminder.notificationSent;
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return `Завтра, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days === -1) {
    return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

const formatRepeatType = (type: string) => {
  const map: Record<string, string> = {
    DAILY: 'Ежедневно',
    WEEKLY: 'Еженедельно',
    MONTHLY: 'Ежемесячно',
    YEARLY: 'Ежегодно',
  };
  return map[type] || type;
};

const handleEdit = (reminder: Reminder) => {
  emit('edit', reminder);
};

const handleDelete = async (reminder: Reminder) => {
  if (!confirm('Удалить это напоминание?')) return;

  try {
    await deleteReminder(reminder.id);
  } catch (e) {
    console.error('Failed to delete reminder:', e);
  }
};

const refresh = () => {
  fetchReminders();
};

onMounted(() => {
  fetchReminders();
});
</script>

<style scoped>
.reminder-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.dark .reminder-list {
  background-color: #111827;
}

.reminder-list-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .reminder-list-header {
  border-bottom-color: #374151;
}

.reminder-list-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

.dark .reminder-list-header h2 {
  color: #f9fafb;
}

.filters {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background-color: transparent;
  color: #6b7280;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dark .filter-btn {
  border-color: #4b5563;
  color: #d1d5db;
}

.filter-btn:hover {
  background-color: #f3f4f6;
}

.dark .filter-btn:hover {
  background-color: #374151;
}

.filter-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.loading,
.error,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #6b7280;
}

.dark .loading,
.dark .error,
.dark .empty {
  color: #9ca3af;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #2563eb;
}

.reminders-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.reminder-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.dark .reminder-item {
  background-color: #1f2937;
}

.reminder-item:hover {
  background-color: #f3f4f6;
}

.dark .reminder-item:hover {
  background-color: #374151;
}

.reminder-item.overdue {
  border-left: 4px solid #ef4444;
}

.reminder-content {
  flex: 1;
}

.reminder-title {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.dark .reminder-title {
  color: #f9fafb;
}

.reminder-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.dark .reminder-meta {
  color: #9ca3af;
}

.reminder-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.action-btn:hover {
  background-color: #e5e7eb;
}

.dark .action-btn:hover {
  background-color: #4b5563;
}
</style>
