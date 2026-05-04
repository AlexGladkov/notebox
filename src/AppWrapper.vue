<template>
  <div>
    <SessionExpiredModal :is-open="sessionExpired" />
    <router-view v-if="!isLoading" />
    <div v-else class="loading-screen">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useAuth } from './composables/useAuth';
import { useTheme } from './composables/useTheme';
import { initNetworkStatus, destroyNetworkStatus } from './services/offline/networkStatus';
import SessionExpiredModal from './components/common/SessionExpiredModal.vue';

const { isLoading, sessionExpired, checkAuth } = useAuth();
const { initialize: initializeTheme } = useTheme();

onMounted(async () => {
  // Инициализируем тему до проверки авторизации
  initializeTheme();
  // Инициализируем отслеживание состояния сети
  initNetworkStatus();
  await checkAuth();
});

onUnmounted(() => {
  destroyNetworkStatus();
});
</script>

<style scoped>
.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:global(.dark) .loading-screen {
  background: #1a1a1a;
}

:global(.dark) .loading-spinner {
  border-color: #404040;
  border-top-color: #667eea;
}
</style>
