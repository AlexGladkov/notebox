<template>
  <div class="tag-filter">
    <div class="filter-header">
      <span class="filter-title">Фильтр по тегам</span>
      <button
        v-if="selectedTagIds.length > 0"
        @click="clearFilter"
        class="clear-button"
        title="Очистить фильтр"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="tags.length === 0" class="empty-state">
      Нет доступных тегов
    </div>

    <div v-else class="tags-list">
      <label
        v-for="tag in tags"
        :key="tag.id"
        class="tag-item"
      >
        <input
          type="checkbox"
          :checked="selectedTagIds.includes(tag.id)"
          @change="toggleTag(tag.id)"
          class="tag-checkbox"
        />
        <span class="tag-badge" :style="{ backgroundColor: tag.color }">
          {{ tag.name }}
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '../types';

const props = defineProps<{
  tags: Tag[];
  selectedTagIds: string[];
}>();

const emit = defineEmits<{
  toggleTag: [tagId: string];
  clearFilter: [];
}>();

const toggleTag = (tagId: string) => {
  emit('toggleTag', tagId);
};

const clearFilter = () => {
  emit('clearFilter');
};
</script>

<style scoped>
.tag-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.filter-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .filter-title {
  color: #9ca3af;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  border-radius: 3px;
  transition: all 0.15s;
}

.clear-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.dark .clear-button {
  color: #9ca3af;
}

.dark .clear-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e5e7eb;
}

.empty-state {
  padding: 12px 8px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

.dark .empty-state {
  color: #6b7280;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.tag-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.dark .tag-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.tag-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.tag-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .tag-badge {
  color: #e5e7eb;
}
</style>
