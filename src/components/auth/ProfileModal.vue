<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="profile-header">
          <div class="profile-avatar-large">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
            <div v-else class="avatar-placeholder-large">
              {{ userInitials }}
            </div>
          </div>
          <h2 class="profile-name">{{ user.name }}</h2>
          <p class="profile-email">{{ user.email }}</p>
        </div>

        <div class="profile-actions">
          <button class="logout-button" @click="handleLogout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { User } from '../../services/auth/types';

const props = defineProps<{
  isOpen: boolean;
  user: User;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'logout'): void;
}>();

const userInitials = computed(() => {
  const names = props.user.name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return props.user.name.substring(0, 2).toUpperCase();
});

function handleLogout() {
  emit('logout');
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.profile-header {
  text-align: center;
  margin-bottom: 24px;
}

.profile-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 16px;
}

.profile-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-large {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 32px;
  font-weight: 600;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.profile-email {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #dc2626;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: #fee;
  border-color: #fecaca;
}

@media (prefers-color-scheme: dark) {
  .modal-content {
    background: #1f1f1f;
  }

  .profile-name {
    color: #ffffff;
  }

  .profile-email {
    color: #9ca3af;
  }

  .logout-button {
    background: #2d2d2d;
    border-color: #404040;
  }

  .logout-button:hover {
    background: #3a3a3a;
    border-color: #dc2626;
  }
}
</style>
