import { apiClient } from './client';
import type { User } from '../services/auth/types';

export interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  themePreference?: string;
}

export const userApi = {
  async updateProfile(request: UpdateUserRequest): Promise<User> {
    return apiClient.patch<User>('/api/auth/me', request);
  },
};
