<template>
  <div v-if="backlinks.length > 0" class="backlinks-section">
    <h3 class="backlinks-title">
      <span class="backlinks-icon">🔗</span>
      {{ backlinks.length }} {{ getBacklinksWord(backlinks.length) }}
    </h3>
    <div class="backlinks-list">
      <div
        v-for="backlink in backlinks"
        :key="backlink.note.id"
        class="backlink-item"
        @click="$emit('navigate', backlink.note.id)"
      >
        <div class="backlink-header">
          <span class="backlink-icon">{{ backlink.note.icon || '📄' }}</span>
          <span class="backlink-title">{{ backlink.note.title || 'Без названия' }}</span>
        </div>
        <div v-if="backlink.context" class="backlink-context">
          {{ backlink.context }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Backlink } from '../composables/useBacklinks';

defineProps<{
  backlinks: Backlink[];
}>();

defineEmits<{
  navigate: [noteId: string];
}>();

/**
 * Возвращает правильное склонение слова "ссылка" в зависимости от количества
 */
function getBacklinksWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'обратных ссылок';
  }

  if (lastDigit === 1) {
    return 'обратная ссылка';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'обратные ссылки';
  }

  return 'обратных ссылок';
}
</script>

<style scoped>
.backlinks-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f9fafb;
  border-top: 2px solid #e5e7eb;
}

.dark .backlinks-section {
  background-color: #1f2937;
  border-top-color: #374151;
}

.backlinks-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.dark .backlinks-title {
  color: #e5e7eb;
}

.backlinks-icon {
  font-size: 1.125rem;
}

.backlinks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.backlink-item {
  padding: 0.75rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dark .backlink-item {
  background-color: #374151;
  border-color: #4b5563;
}

.backlink-item:hover {
  background-color: #f3f4f6;
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.dark .backlink-item:hover {
  background-color: #4b5563;
  border-color: #60a5fa;
  box-shadow: 0 2px 4px rgba(96, 165, 250, 0.2);
}

.backlink-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.backlink-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.backlink-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.dark .backlink-title {
  color: #e5e7eb;
}

.backlink-context {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dark .backlink-context {
  color: #9ca3af;
}
</style>
