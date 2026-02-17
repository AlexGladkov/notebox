import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { authStore } from '../stores/authStore';

export async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // Wait for auth check if not initialized
  if (!authStore.isInitialized.value) {
    await authStore.checkAuth();
  }

  const isAuthenticated = authStore.isAuthenticated.value;
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthRoute = to.path === '/login';

  if (requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (isAuthRoute && isAuthenticated) {
    next({ path: '/' });
  } else {
    next();
  }
}
