import { ref } from 'vue';
import { remindersApi } from '../api/reminders';
import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '../types/reminder';

export function useReminders() {
  const reminders = ref<Reminder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchReminders = async () => {
    loading.value = true;
    error.value = null;
    try {
      reminders.value = await remindersApi.getAll();
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to fetch reminders:', e);
    } finally {
      loading.value = false;
    }
  };

  const fetchRemindersByNoteId = async (noteId: string) => {
    loading.value = true;
    error.value = null;
    try {
      return await remindersApi.getByNoteId(noteId);
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to fetch reminders for note:', e);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const createReminder = async (request: CreateReminderRequest) => {
    loading.value = true;
    error.value = null;
    try {
      const reminder = await remindersApi.create(request);
      reminders.value.push(reminder);
      return reminder;
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to create reminder:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const updateReminder = async (id: string, request: UpdateReminderRequest) => {
    loading.value = true;
    error.value = null;
    try {
      const updated = await remindersApi.update(id, request);
      const index = reminders.value.findIndex(r => r.id === id);
      if (index !== -1) {
        reminders.value[index] = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to update reminder:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const deleteReminder = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await remindersApi.delete(id);
      reminders.value = reminders.value.filter(r => r.id !== id);
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to delete reminder:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const getUpcomingReminders = async (limit: number = 10) => {
    loading.value = true;
    error.value = null;
    try {
      return await remindersApi.getUpcoming(limit);
    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to fetch upcoming reminders:', e);
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
