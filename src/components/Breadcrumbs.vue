<template>
  <nav v-if="path.length > 0" class="breadcrumbs">
    <ol class="breadcrumb-list">
      <li
        v-for="(item, index) in path"
        :key="item.id"
        class="breadcrumb-item"
      >
        <button
          v-if="index < path.length - 1"
          @click="$emit('navigate', item.id)"
          class="breadcrumb-link"
        >
          <span v-if="item.icon" class="breadcrumb-icon">{{ item.icon }}</span>
          <span class="breadcrumb-text">{{ item.title || 'Без названия' }}</span>
        </button>
        <span v-else class="breadcrumb-current">
          <span v-if="item.icon" class="breadcrumb-icon">{{ item.icon }}</span>
          <span class="breadcrumb-text">{{ item.title || 'Без названия' }}</span>
        </span>

        <span v-if="index < path.length - 1" class="breadcrumb-separator">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { Note } from '../types';

defineProps<{
  path: Note[];
}>();

defineEmits<{
  navigate: [noteId: string];
}>();
</script>

<style scoped>
.breadcrumbs {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.dark .breadcrumbs {
  border-bottom-color: #374151;
  background-color: #1f2937;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
  color: #6b7280;
  font-size: 14px;
}

.dark .breadcrumb-link {
  color: #9ca3af;
}

.breadcrumb-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.dark .breadcrumb-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.dark .breadcrumb-current {
  color: #f3f4f6;
}

.breadcrumb-icon {
  font-size: 14px;
  line-height: 1;
}

.breadcrumb-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: #9ca3af;
  flex-shrink: 0;
}

.dark .breadcrumb-separator {
  color: #6b7280;
}
</style>
