import { defineStore } from 'pinia';
import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '../types/reminder';
import { remindersApi } from '../api/reminders';
import { getErrorMessage } from '../types/composables';

export const useRemindersStore = defineStore('reminders', {
  state: () => ({
    reminders: [] as Reminder[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getRemindersByNoteId: (state) => (noteId: string) =>
      state.reminders.filter(r => r.noteId === noteId),

    upcomingReminders: (state) =>
      state.reminders
        .filter(r => new Date(r.remindAt) > new Date())
        .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()),
  },

  actions: {
    async fetchReminders(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.reminders = await remindersApi.getAll();
      } catch (err: unknown) {
        this.error = getErrorMessage(err);
        console.error('Failed to fetch reminders:', err);
      } finally {
        this.loading = false;
      }
    },

    async createReminder(request: CreateReminderRequest): Promise<Reminder> {
      this.loading = true;
      this.error = null;
      try {
        const reminder = await remindersApi.create(request);
        this.reminders.push(reminder);
        return reminder;
      } catch (err: unknown) {
        this.error = getErrorMessage(err);
        console.error('Failed to create reminder:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateReminder(id: string, request: UpdateReminderRequest): Promise<Reminder> {
      this.loading = true;
      this.error = null;
      try {
        const updated = await remindersApi.update(id, request);
        const index = this.reminders.findIndex(r => r.id === id);
        if (index !== -1) {
          this.reminders[index] = updated;
        }
        return updated;
      } catch (err: unknown) {
        this.error = getErrorMessage(err);
        console.error('Failed to update reminder:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteReminder(id: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        await remindersApi.delete(id);
        this.reminders = this.reminders.filter(r => r.id !== id);
      } catch (err: unknown) {
        this.error = getErrorMessage(err);
        console.error('Failed to delete reminder:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async getUpcomingReminders(limit: number = 10): Promise<Reminder[]> {
      this.loading = true;
      this.error = null;
      try {
        return await remindersApi.getUpcoming(limit);
      } catch (err: unknown) {
        this.error = getErrorMessage(err);
        console.error('Failed to fetch upcoming reminders:', err);
        return [];
      } finally {
        this.loading = false;
      }
    },
  },
});
