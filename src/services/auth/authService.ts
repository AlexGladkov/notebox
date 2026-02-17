import { apiClient } from '../../api/client';
import type { User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiClient.get<User>('/api/auth/me');
      return user;
    } catch (error) {
      return null;
    }
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  getLoginUrl(provider: 'google' | 'apple'): string {
    return `${API_BASE_URL}/api/auth/login/${provider}`;
  }
};
