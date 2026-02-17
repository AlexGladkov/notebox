<template>
  <button class="oauth-button" :class="`oauth-button-${provider}`" @click="$emit('click')">
    <span class="oauth-icon">
      <svg v-if="provider === 'google'" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <svg v-else-if="provider === 'apple'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    </span>
    <span class="oauth-text">
      Продолжить с {{ providerName }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  provider: 'google' | 'apple';
}>();

defineEmits<{
  (e: 'click'): void;
}>();

const providerName = computed(() => {
  return props.provider === 'google' ? 'Google' : 'Apple';
});
</script>

<style scoped>
.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.oauth-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.oauth-button:active {
  transform: translateY(0);
}

.oauth-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.oauth-text {
  color: #374151;
}

.oauth-button-apple {
  background: #000;
  border-color: #000;
  color: #fff;
}

.oauth-button-apple:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.oauth-button-apple .oauth-text {
  color: #fff;
}

@media (prefers-color-scheme: dark) {
  .oauth-button {
    background: #2d2d2d;
    border-color: #404040;
  }

  .oauth-button:hover {
    background: #3a3a3a;
    border-color: #505050;
  }

  .oauth-text {
    color: #e5e5e5;
  }
}
</style>
