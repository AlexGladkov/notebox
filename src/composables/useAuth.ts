import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const store = useAuthStore();
  const { user, isAuthenticated, isLoading, isInitialized, sessionExpired, isDemoUser } = storeToRefs(store);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    sessionExpired,
    isDemoUser,
    checkAuth: store.checkAuth,
    logout: store.logout,
    setSessionExpired: store.setSessionExpired,
  };
}
