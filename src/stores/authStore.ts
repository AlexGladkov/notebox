import { defineStore } from 'pinia';
import { authService } from '../services/auth/authService';
import { userApi, type UpdateUserRequest } from '../api/user';
import type { User } from '../services/auth/types';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    isInitialized: false,
    sessionExpired: false,
    _authPromise: null as Promise<void> | null,
  }),

  getters: {
    isAuthenticated: (state) => state.user !== null,
    isDemoUser: (state) => state.user?.email === 'demo@notebox.app',
  },

  actions: {
    async checkAuth() {
      // Если уже загружается — вернуть существующий Promise
      if (this._authPromise) {
        return this._authPromise;
      }

      this._authPromise = this._doCheckAuth();
      return this._authPromise;
    },

    async _doCheckAuth() {
      this.isLoading = true;
      try {
        const user = await authService.getCurrentUser();
        this.user = user;
        this.sessionExpired = false;
      } catch (error) {
        this.user = null;
      } finally {
        this.isLoading = false;
        this.isInitialized = true;
        this._authPromise = null;
      }
    },

    async logout() {
      try {
        await authService.logout();
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        this.user = null;
        this.sessionExpired = false;
      }
    },

    setUser(user: User | null) {
      this.user = user;
    },

    setSessionExpired(expired: boolean) {
      this.sessionExpired = expired;
      if (expired) {
        this.user = null;
      }
    },

    async updateProfile(request: UpdateUserRequest): Promise<User> {
      const updatedUser = await userApi.updateProfile(request);
      this.user = updatedUser;
      return updatedUser;
    },
  },
});
