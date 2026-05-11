<template>
  <div
    v-if="reminder"
    class="reminder-badge"
    :class="{ overdue: isOverdue }"
  >
    <span class="reminder-icon">🔔</span>
    <span class="reminder-time">{{ formattedTime }}</span>
    <button
      class="edit-btn"
      @click.stop="$emit('edit', reminder)"
      title="Редактировать напоминание"
    >
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

<style scoped>
.reminder-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 9999px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.dark .reminder-badge {
  background-color: #1e3a5f;
  color: #90caf9;
}

.reminder-badge.overdue {
  background-color: #ffebee;
  color: #d32f2f;
}

.dark .reminder-badge.overdue {
  background-color: #5f1e1e;
  color: #ef5350;
}

.reminder-icon {
  font-size: 1rem;
}

.reminder-time {
  font-weight: 500;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.edit-btn:hover {
  opacity: 1;
}

.edit-btn span {
  font-size: 0.875rem;
}
</style>
