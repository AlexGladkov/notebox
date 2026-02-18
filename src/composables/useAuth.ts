import { authStore } from '../stores/authStore';

export function useAuth() {
  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    isInitialized: authStore.isInitialized,
    sessionExpired: authStore.sessionExpired,
    isDemoUser: authStore.isDemoUser,
    checkAuth: () => authStore.checkAuth(),
    logout: () => authStore.logout(),
    setSessionExpired: (expired: boolean) => authStore.setSessionExpired(expired)
  };
}
