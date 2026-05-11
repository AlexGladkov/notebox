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
          <input
            v-model="form.title"
            type="text"
            placeholder="Название напоминания"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>Дата и время</label>
          <DateTimePicker v-model="form.remindAt" />
        </div>

        <div class="form-group">
          <label>Повторение</label>
          <select v-model="form.repeatType" class="form-select">
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
          <label class="checkbox-label">
            <input v-model="form.syncToGoogleCalendar" type="checkbox" />
            <span>Добавить в Google Calendar</span>
          </label>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="close">Отмена</button>
        <button
          class="btn-primary"
          @click="save"
          :disabled="!isValid || loading"
        >
          {{ loading ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import DateTimePicker from './DateTimePicker.vue';
import { useReminders } from '../../composables/useReminders';
import { useCalendarSync } from '../../composables/useCalendarSync';
import type { Reminder, RepeatType } from '../../types/reminder';

const props = defineProps<{
  visible: boolean;
  noteId: string;
  noteTitle?: string;
  reminder?: Reminder;
}>();

const emit = defineEmits<{
  close: [];
  saved: [reminder: Reminder];
}>();

const { createReminder, updateReminder } = useReminders();
const { isGoogleConnected } = useCalendarSync();

const form = ref({
  title: '',
  remindAt: Date.now() + 3600000, // через час по умолчанию
  repeatType: 'NONE' as RepeatType,
  repeatEndAt: undefined as number | undefined,
  syncToGoogleCalendar: false,
});

const loading = ref(false);
const error = ref<string | null>(null);

const isEditing = computed(() => !!props.reminder);
const hasGoogleCalendar = computed(() => isGoogleConnected.value);

const isValid = computed(() => {
  return form.value.remindAt > 0;
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.reminder) {
        // Редактирование существующего напоминания
        form.value = {
          title: props.reminder.title,
          remindAt: props.reminder.remindAt,
          repeatType: props.reminder.repeatType,
          repeatEndAt: props.reminder.repeatEndAt,
          syncToGoogleCalendar: !!props.reminder.googleEventId,
        };
      } else {
        // Создание нового напоминания
        form.value = {
          title: props.noteTitle || '',
          remindAt: Date.now() + 3600000,
          repeatType: 'NONE',
          repeatEndAt: undefined,
          syncToGoogleCalendar: isGoogleConnected.value,
        };
      }
      error.value = null;
    }
  }
);

const close = () => {
  emit('close');
};

const save = async () => {
  if (!isValid.value || loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    if (isEditing.value && props.reminder) {
      // Обновление
      const updated = await updateReminder(props.reminder.id, {
        title: form.value.title,
        remindAt: form.value.remindAt,
        repeatType: form.value.repeatType,
        repeatEndAt: form.value.repeatEndAt,
      });
      emit('saved', updated);
    } else {
      // Создание
      const created = await createReminder({
        noteId: props.noteId,
        title: form.value.title,
        remindAt: form.value.remindAt,
        repeatType: form.value.repeatType,
        repeatEndAt: form.value.repeatEndAt,
        syncToGoogleCalendar: form.value.syncToGoogleCalendar,
      });
      emit('saved', created);
    }
    close();
  } catch (e: any) {
    error.value = e.message || 'Не удалось сохранить напоминание';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.reminder-modal {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.dark .reminder-modal {
  background-color: #1f2937;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .modal-header {
  border-bottom-color: #374151;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.dark .modal-header h2 {
  color: #f9fafb;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #111827;
}

.dark .close-btn:hover {
  color: #f9fafb;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.dark .form-group label {
  color: #d1d5db;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #111827;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dark .form-input,
.dark .form-select {
  background-color: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.dark .error-message {
  background-color: #7f1d1d;
  color: #fca5a5;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.dark .modal-footer {
  border-top-color: #374151;
}

.btn-primary,
.btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.dark .btn-secondary {
  border-color: #4b5563;
  color: #d1d5db;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.dark .btn-secondary:hover {
  background-color: #374151;
}
</style>
