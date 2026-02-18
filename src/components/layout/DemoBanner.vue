<template>
  <div class="demo-banner">
    <div class="demo-banner-content">
      <div class="demo-banner-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <span class="demo-banner-text">
        Демо-режим — данные общие для всех
      </span>
      <button class="demo-banner-logout" @click="handleLogout">
        Выйти
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../../composables/useAuth';
import { useRouter } from 'vue-router';

const { logout } = useAuth();
const router = useRouter();

const handleLogout = async () => {
  await logout();
  router.push('/login');
};
</script>

<style scoped>
.demo-banner {
  width: 100%;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-bottom: 2px solid #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  z-index: 1000;
}

.demo-banner-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-banner-icon {
  display: flex;
  align-items: center;
  color: #78350f;
}

.demo-banner-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #78350f;
}

.demo-banner-logout {
  padding: 6px 16px;
  background: rgba(120, 53, 15, 0.1);
  border: 1px solid #78350f;
  border-radius: 6px;
  color: #78350f;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-banner-logout:hover {
  background: rgba(120, 53, 15, 0.2);
  transform: translateY(-1px);
}

.demo-banner-logout:active {
  transform: translateY(0);
}

@media (prefers-color-scheme: dark) {
  .demo-banner {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border-bottom-color: #d97706;
  }

  .demo-banner-icon,
  .demo-banner-text {
    color: #fef3c7;
  }

  .demo-banner-logout {
    background: rgba(254, 243, 199, 0.1);
    border-color: #fef3c7;
    color: #fef3c7;
  }

  .demo-banner-logout:hover {
    background: rgba(254, 243, 199, 0.2);
  }
}
</style>
