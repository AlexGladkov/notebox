import { reactive, computed } from 'vue';
import { authService } from '../services/auth/authService';
import type { User } from '../services/auth/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  sessionExpired: boolean;
}

const state = reactive<AuthState>({
  user: null,
  isLoading: false,
  isInitialized: false,
  sessionExpired: false
});

export const authStore = {
  state: computed(() => state),

  get user() {
    return computed(() => state.user);
  },

  get isAuthenticated() {
    return computed(() => state.user !== null);
  },

  get isLoading() {
    return computed(() => state.isLoading);
  },

  get isInitialized() {
    return computed(() => state.isInitialized);
  },

  get sessionExpired() {
    return computed(() => state.sessionExpired);
  },

  async checkAuth() {
    if (state.isLoading) return;

    state.isLoading = true;
    try {
      const user = await authService.getCurrentUser();
      state.user = user;
      state.sessionExpired = false;
    } catch (error) {
      state.user = null;
    } finally {
      state.isLoading = false;
      state.isInitialized = true;
    }
  },

  async logout() {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      state.user = null;
      state.sessionExpired = false;
    }
  },

  setUser(user: User | null) {
    state.user = user;
  },

  setSessionExpired(expired: boolean) {
    state.sessionExpired = expired;
    if (expired) {
      state.user = null;
    }
  }
};
