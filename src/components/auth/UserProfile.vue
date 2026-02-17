<template>
  <div class="user-profile" @click="emit('click')" role="button" tabindex="0">
    <div class="user-avatar">
      <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
      <div v-else class="avatar-placeholder">
        {{ userInitials }}
      </div>
    </div>
    <div class="user-info">
      <div class="user-name">{{ displayName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { User } from '../../services/auth/types';

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const userInitials = computed(() => {
  const names = props.user.name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return props.user.name.substring(0, 2).toUpperCase();
});

const displayName = computed(() => {
  if (props.user.name.length > 20) {
    return props.user.name.substring(0, 20) + '...';
  }
  return props.user.name;
});
</script>

<style scoped>
.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-profile:hover {
  background: rgba(0, 0, 0, 0.05);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-color-scheme: dark) {
  .user-profile:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .user-name {
    color: #e5e5e5;
  }
}
</style>
