import { apiClient } from './client';
import type {
  Reminder,
  CreateReminderRequest,
  UpdateReminderRequest
} from '../types/reminder';

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
