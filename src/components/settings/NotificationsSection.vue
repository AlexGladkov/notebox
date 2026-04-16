<template>
  <div class="notifications-section">
    <h2 class="section-title">Уведомления</h2>
    <div class="placeholder">
      <svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <p class="placeholder-text">Скоро</p>
      <p class="placeholder-desc">Настройки уведомлений появятся в следующих версиях</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Заглушка для будущей функциональности
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

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.placeholder-text {
  font-size: 18px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 8px 0;
}

.placeholder-desc {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}




</style>

<style>
/* Dark theme styles - unscoped */
.dark .section-title {
  color: #f9fafb;
}
.dark .placeholder-icon {
  color: #4b5563;
}
.dark .placeholder-text {
  color: #9ca3af;
}
.dark .placeholder-desc {
  color: #6b7280;
}
</style>
