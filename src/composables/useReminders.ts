import { ref } from 'vue';
import { remindersApi } from '../api/reminders';
import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '../types/reminder';
import { getErrorMessage } from '../types/composables';

export function useReminders() {
  const reminders = ref<Reminder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchReminders = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      reminders.value = await remindersApi.getAll();
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to fetch reminders:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchRemindersByNoteId = async (noteId: string): Promise<Reminder[]> => {
    loading.value = true;
    error.value = null;
    try {
      return await remindersApi.getByNoteId(noteId);
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to fetch reminders for note:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const createReminder = async (request: CreateReminderRequest): Promise<Reminder> => {
    loading.value = true;
    error.value = null;
    try {
      const reminder = await remindersApi.create(request);
      reminders.value.push(reminder);
      return reminder;
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to create reminder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateReminder = async (id: string, request: UpdateReminderRequest): Promise<Reminder> => {
    loading.value = true;
    error.value = null;
    try {
      const updated = await remindersApi.update(id, request);
      const index = reminders.value.findIndex(r => r.id === id);
      if (index !== -1) {
        reminders.value[index] = updated;
      }
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to update reminder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteReminder = async (id: string): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      await remindersApi.delete(id);
      reminders.value = reminders.value.filter(r => r.id !== id);
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to delete reminder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getUpcomingReminders = async (limit: number = 10): Promise<Reminder[]> => {
    loading.value = true;
    error.value = null;
    try {
      return await remindersApi.getUpcoming(limit);
    } catch (err: unknown) {
      error.value = getErrorMessage(err);
      console.error('Failed to fetch upcoming reminders:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  return {
    reminders,
    loading,
    error,
    fetchReminders,
    fetchRemindersByNoteId,
    createReminder,
    updateReminder,
    deleteReminder,
    getUpcomingReminders,
  };
}
