import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { authGuard } from './guards';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/MainView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/graph',
    name: 'graph',
    component: () => import('../views/GraphView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    redirect: () => ({ path: '/', query: {} }),
    meta: { requiresAuth: true }
  },
  {
    path: '/billing',
    name: 'billing',
    component: () => import('../views/BillingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(authGuard);

export default router;
