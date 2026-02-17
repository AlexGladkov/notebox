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
import { onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import SessionExpiredModal from './components/common/SessionExpiredModal.vue';

const { isLoading, sessionExpired, checkAuth } = useAuth();

onMounted(async () => {
  await checkAuth();
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

@media (prefers-color-scheme: dark) {
  .loading-screen {
    background: #1a1a1a;
  }

  .loading-spinner {
    border-color: #404040;
    border-top-color: #667eea;
  }
}
</style>
