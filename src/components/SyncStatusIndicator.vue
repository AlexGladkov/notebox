<template>
  <div class="sync-status-indicator">
    <div class="status-container">
      <!-- Индикатор сетевого соединения -->
      <div
        class="network-status"
        :class="{ 'online': isOnline, 'offline': !isOnline }"
        :title="isOnline ? 'Онлайн' : 'Офлайн'"
      >
        <svg
          v-if="isOnline"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>

      <!-- Индикатор синхронизации -->
      <div
        v-if="hasPendingChanges || isSyncing || hasError"
        class="sync-indicator"
        :class="syncStatusClass"
        :title="syncStatusText"
        @click="handleSyncClick"
      >
        <!-- Иконка синхронизации -->
        <svg
          v-if="isSyncing"
          class="sync-icon spinning"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>

        <!-- Иконка ошибки -->
        <svg
          v-else-if="hasError"
          class="sync-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>

        <!-- Иконка ожидания -->
        <svg
          v-else
          class="sync-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>

        <!-- Счётчик несинхронизированных изменений -->
        <span v-if="hasPendingChanges && !isSyncing" class="pending-count">
          {{ syncState.pendingCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNetworkStatus } from '../composables/useNetworkStatus';
import { useOffline } from '../composables/useOffline';

const { isOnline } = useNetworkStatus();
const { syncState, isSyncing, hasPendingChanges, hasError, sync } = useOffline();

const syncStatusClass = computed(() => {
  if (hasError.value) return 'error';
  if (isSyncing.value) return 'syncing';
  if (hasPendingChanges.value) return 'pending';
  return '';
});

const syncStatusText = computed(() => {
  if (hasError.value) {
    return `Ошибка синхронизации: ${syncState.value.lastError || 'Неизвестная ошибка'}`;
  }
  if (isSyncing.value) {
    return 'Синхронизация...';
  }
  if (hasPendingChanges.value) {
    return `Несинхронизированных изменений: ${syncState.value.pendingCount}. Нажмите для синхронизации.`;
  }
  return 'Синхронизировано';
});

async function handleSyncClick() {
  if (isOnline.value && !isSyncing.value) {
    try {
      await sync();
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
}
</script>

<style scoped>
.sync-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 13px;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.network-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s;
}

.network-status.online {
  color: #10b981;
}

.network-status.offline {
  color: #ef4444;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.sync-indicator:hover {
  opacity: 0.8;
}

.sync-indicator.syncing {
  color: #3b82f6;
}

.sync-indicator.pending {
  color: #f59e0b;
}

.sync-indicator.error {
  color: #ef4444;
  cursor: pointer;
}

.sync-icon {
  flex-shrink: 0;
}

.sync-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pending-count {
  font-size: 12px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}
</style>
