import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

export async function authGuard(to: RouteLocationNormalized) {
  const authStore = useAuthStore();

  // Если маршрут не найден (пустой to.matched), пропускаем guard
  // catch-all маршрут обработает его
  if (to.matched.length === 0) {
    return;
  }

  // Ждём завершения auth проверки (Promise tracking гарантирует завершение)
  if (!authStore.isInitialized) {
    await authStore.checkAuth();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthRoute = to.path === '/login';

  if (requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  } else if (isAuthRoute && isAuthenticated) {
    return { path: '/' };
  }
  // return undefined для продолжения навигации
}
