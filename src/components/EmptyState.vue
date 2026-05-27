<template>
  <div class="empty-state">
    <!-- Иллюстрация или дефолтная иконка -->
    <component v-if="icon" :is="icon" class="empty-state-illustration" />
    <svg v-else class="empty-state-default-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>

    <!-- Заголовок -->
    <h3 class="empty-state-title">{{ title }}</h3>

    <!-- Описание -->
    <p v-if="description" class="empty-state-description">{{ description }}</p>

    <!-- Подсказки (для поиска) -->
    <ul v-if="hints && hints.length > 0" class="empty-state-hints">
      <li v-for="(hint, index) in hints" :key="index" class="empty-state-hint">
        {{ hint }}
      </li>
    </ul>

    <!-- CTA кнопка -->
    <button
      v-if="ctaLabel"
      @click="$emit('cta-click')"
      :class="[
        'empty-state-cta',
        ctaVariant === 'secondary' ? 'cta-secondary' : 'cta-primary'
      ]"
    >
      {{ ctaLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  title: string;
  description?: string;
  icon?: Component;
  ctaLabel?: string;
  ctaVariant?: 'primary' | 'secondary';
  hints?: string[];
}>();

defineEmits<{
  'cta-click': [];
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  height: 100%;
}

.empty-state-illustration {
  margin-bottom: 24px;
}

.empty-state-default-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
  color: #9ca3af;
}

.dark .empty-state-default-icon {
  color: #6b7280;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.dark .empty-state-title {
  color: #d1d5db;
}

.empty-state-description {
  font-size: 14px;
  color: #6b7280;
  max-width: 480px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.dark .empty-state-description {
  color: #9ca3af;
}

.empty-state-hints {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  max-width: 400px;
}

.empty-state-hint {
  font-size: 13px;
  color: #6b7280;
  padding: 6px 0;
  text-align: left;
  position: relative;
  padding-left: 20px;
}

.empty-state-hint::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: #9ca3af;
}

.dark .empty-state-hint {
  color: #9ca3af;
}

.dark .empty-state-hint::before {
  color: #6b7280;
}

.empty-state-cta {
  margin-top: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}

.cta-primary {
  background-color: #3b82f6;
  color: #ffffff;
}

.cta-primary:hover {
  background-color: #2563eb;
}

.cta-primary:active {
  background-color: #1d4ed8;
  transform: scale(0.98);
}

.dark .cta-primary {
  background-color: #60a5fa;
  color: #111827;
}

.dark .cta-primary:hover {
  background-color: #3b82f6;
}

.dark .cta-primary:active {
  background-color: #2563eb;
}

.cta-secondary {
  background-color: transparent;
  color: #6b7280;
  border: 1.5px solid #d1d5db;
}

.cta-secondary:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.cta-secondary:active {
  background-color: #e5e7eb;
  transform: scale(0.98);
}

.dark .cta-secondary {
  color: #9ca3af;
  border-color: #4b5563;
}

.dark .cta-secondary:hover {
  background-color: #374151;
  border-color: #6b7280;
}

.dark .cta-secondary:active {
  background-color: #4b5563;
}
</style>
