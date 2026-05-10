<template>
  <Transition name="fade-up">
    <div v-if="isOpen" class="flex flex-col gap-3 mb-3">
      <!-- Текстовая заметка -->
      <button
        @click="emit('select', 'text')"
        class="fab-item group"
        :title="'Текстовая заметка'"
        :aria-label="'Создать текстовую заметку'"
      >
        <span class="text-xl">✏️</span>
        <span class="tooltip">Текст</span>
      </button>

      <!-- Голосовая заметка -->
      <button
        @click="emit('select', 'voice')"
        class="fab-item group"
        :title="'Голосовая заметка'"
        :aria-label="'Создать голосовую заметку'"
      >
        <span class="text-xl">🎤</span>
        <span class="tooltip">Голос</span>
      </button>

      <!-- Фото OCR -->
      <button
        @click="emit('select', 'photo')"
        class="fab-item group"
        :title="'Распознать текст с фото'"
        :aria-label="'Распознать текст с фото'"
      >
        <span class="text-xl">📷</span>
        <span class="tooltip">Фото</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { CaptureType } from '../../types';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  select: [type: CaptureType];
}>();
</script>

<style scoped>
.fab-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background-color: #3b82f6;
  border-radius: 9999px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  outline: none;
}

.fab-item:hover {
  background-color: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.fab-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.fab-item:active {
  transform: scale(0.95);
}

.tooltip {
  position: absolute;
  right: calc(100% + 0.75rem);
  background-color: #1f2937;
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.group:hover .tooltip {
  opacity: 1;
}

.dark .fab-item {
  background-color: #3b82f6;
}

.dark .fab-item:hover {
  background-color: #2563eb;
}

.dark .tooltip {
  background-color: #374151;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.3s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(1rem);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

.fade-up-enter-active .fab-item {
  animation: slide-up 0.3s ease backwards;
}

.fade-up-enter-active .fab-item:nth-child(1) {
  animation-delay: 0.05s;
}

.fade-up-enter-active .fab-item:nth-child(2) {
  animation-delay: 0.1s;
}

.fade-up-enter-active .fab-item:nth-child(3) {
  animation-delay: 0.15s;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
