import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import AppWrapper from './AppWrapper.vue';
import router from './router';
import { useAuthStore } from './stores/authStore';

const app = createApp(AppWrapper);
const pinia = createPinia();

app.use(pinia);

// CRITICAL: Инициализировать auth ДО router
const authStore = useAuthStore();
authStore.checkAuth()
  .then(() => {
    app.use(router);
    app.mount('#app');
  })
  .catch((error) => {
    console.error('Failed to initialize auth:', error);
    // Всё равно монтируем приложение, router guard обработает отсутствие auth
    app.use(router);
    app.mount('#app');
  });
