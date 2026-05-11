import { apiClient } from './client';

export const calendarApi = {
  async getGoogleCalendarStatus(): Promise<{ connected: boolean }> {
    return apiClient.get<{ connected: boolean }>('/api/calendar/google/status');
  },
};
