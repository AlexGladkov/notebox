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
          <svg v-if="!item.icon" class="page-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span v-else class="breadcrumb-icon">{{ item.icon }}</span>
          <span class="breadcrumb-text">{{ item.title || 'Без названия' }}</span>
        </button>
        <span v-else class="breadcrumb-current">
          <svg v-if="!item.icon" class="page-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span v-else class="breadcrumb-icon">{{ item.icon }}</span>
          <span class="breadcrumb-text">{{ item.title || 'Без названия' }}</span>
        </span>

        <span v-if="index < path.length - 1" class="breadcrumb-separator">/</span>
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
  padding: 6px 16px;
  background-color: transparent;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.15s;
  color: #6b7280;
  font-size: 13px;
}

.dark .breadcrumb-link {
  color: #9ca3af;
}

.breadcrumb-link:hover {
  background-color: rgba(0, 0, 0, 0.06);
  color: #111827;
}

.dark .breadcrumb-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  font-size: 13px;
  color: #111827;
}

.dark .breadcrumb-current {
  color: #f3f4f6;
}

.page-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.6;
}

.breadcrumb-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.breadcrumb-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-separator {
  color: #d1d5db;
  font-size: 13px;
  user-select: none;
}

.dark .breadcrumb-separator {
  color: #6b7280;
}
</style>
