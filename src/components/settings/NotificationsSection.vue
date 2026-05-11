<template>
  <div class="notifications-section">
    <h2 class="section-title">Уведомления</h2>

    <!-- Push-уведомления -->
    <div class="setting-group">
      <h3 class="group-title">Push-уведомления</h3>
      <p class="group-description">
        Получайте уведомления о напоминаниях в браузере
      </p>

      <div v-if="!isSupported" class="alert alert-warning">
        ⚠️ Ваш браузер не поддерживает push-уведомления
      </div>

      <div v-else-if="!isConfigured" class="alert alert-info">
        ℹ️ Push-уведомления не настроены на сервере
      </div>

      <div v-else class="settings-options">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Разрешить уведомления</div>
            <div class="setting-desc">
              {{ isGranted ? 'Уведомления разрешены' : 'Уведомления заблокированы' }}
            </div>
          </div>
          <button
            v-if="!isGranted"
            @click="handleEnablePush"
            class="btn-primary"
            :disabled="loading"
          >
            {{ loading ? 'Настройка...' : 'Разрешить' }}
          </button>
          <button
            v-else
            @click="handleDisablePush"
            class="btn-secondary"
            :disabled="loading"
          >
            Отключить
          </button>
        </div>
      </div>
    </div>

    <!-- Google Calendar -->
    <div class="setting-group">
      <h3 class="group-title">Google Calendar</h3>
      <p class="group-description">
        Синхронизируйте напоминания с Google Calendar
      </p>

      <div class="settings-options">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Статус подключения</div>
            <div class="setting-desc">
              {{ isGoogleConnected ? 'Подключено' : 'Не подключено' }}
            </div>
          </div>
          <button
            v-if="!isGoogleConnected"
            @click="handleConnectGoogle"
            class="btn-primary"
          >
            Подключить
          </button>
          <span v-else class="status-badge success">✓ Подключено</span>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePushNotifications } from '../../composables/usePushNotifications';
import { useCalendarSync } from '../../composables/useCalendarSync';

const { isSupported, isGranted, isConfigured, error, requestPermission, subscribe, unsubscribe } = usePushNotifications();
const { isGoogleConnected } = useCalendarSync();

const loading = ref(false);

const handleEnablePush = async () => {
  loading.value = true;
  try {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
    }
  } catch (e: any) {
    console.error('Failed to enable push notifications:', e);
  } finally {
    loading.value = false;
  }
};

const handleDisablePush = async () => {
  loading.value = true;
  try {
    await unsubscribe();
  } catch (e: any) {
    console.error('Failed to disable push notifications:', e);
  } finally {
    loading.value = false;
  }
};

const handleConnectGoogle = () => {
  // Перенаправляем на Google OAuth
  window.location.href = '/api/auth/login/google';
};
</script>

<style scoped>
.notifications-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
}

.setting-group {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.setting-group:last-child {
  border-bottom: none;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.group-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: #6b7280;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #d1fae5;
  color: #065f46;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.alert-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.alert-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
}
</style>

<style>
/* Dark theme styles - unscoped */
.dark .section-title,
.dark .group-title,
.dark .setting-label {
  color: #f9fafb;
}

.dark .group-description,
.dark .setting-desc {
  color: #9ca3af;
}

.dark .setting-item {
  background-color: #1f2937;
}

.dark .setting-group {
  border-bottom-color: #374151;
}

.dark .btn-secondary {
  border-color: #4b5563;
  color: #d1d5db;
}

.dark .btn-secondary:hover:not(:disabled) {
  background-color: #374151;
}

.dark .status-badge.success {
  background-color: #064e3b;
  color: #6ee7b7;
}

.dark .alert-warning {
  background-color: #78350f;
  color: #fbbf24;
}

.dark .alert-info {
  background-color: #1e3a8a;
  color: #93c5fd;
}

.dark .alert-error {
  background-color: #7f1d1d;
  color: #fca5a5;
}
</style>
