<template>
  <div class="favorites-list">
    <div class="favorites-header" @click="toggleExpanded">
      <button class="expand-button">
        <svg
          class="w-3 h-3 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span class="favorites-icon">⭐</span>
      <span class="favorites-title">Избранное</span>
      <span class="favorites-count">{{ notes.length }}</span>
    </div>

    <div v-if="isExpanded" class="favorites-content">
      <div
        v-for="note in notes"
        :key="note.id"
        class="favorite-item"
        :class="{ 'is-selected': selectedNoteId === note.id }"
        @click="handleNoteClick(note.id, $event)"
        @mouseenter="hoveredNoteId = note.id"
        @mouseleave="hoveredNoteId = null"
      >
        <span v-if="note.icon" class="note-icon">{{ note.icon }}</span>
        <span v-else class="note-icon-placeholder">📄</span>
        <span class="note-title">{{ note.title || 'Без названия' }}</span>

        <button
          v-if="hoveredNoteId === note.id"
          @click.stop="$emit('removeFavorite', note.id)"
          class="remove-favorite-button"
          title="Убрать из избранного"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Note } from '../types';

defineProps<{
  notes: Note[];
  selectedNoteId: string | null;
}>();

const emit = defineEmits<{
  selectNote: [id: string, forceNewTab: boolean];
  removeFavorite: [id: string];
}>();

const isExpanded = ref(true);
const hoveredNoteId = ref<string | null>(null);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const handleNoteClick = (noteId: string, event: MouseEvent) => {
  const forceNewTab = event.ctrlKey || event.metaKey;
  emit('selectNote', noteId, forceNewTab);
};
</script>

<style scoped>
.favorites-list {
  margin-bottom: 16px;
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.favorites-header:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .favorites-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  flex-shrink: 0;
}

.dark .expand-button {
  color: #9ca3af;
}

.expand-button:hover {
  color: #374151;
}

.dark .expand-button:hover {
  color: #d1d5db;
}

.favorites-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.favorites-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  flex: 1;
}

.dark .favorites-title {
  color: #d1d5db;
}

.favorites-count {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.dark .favorites-count {
  color: #6b7280;
}

.favorites-content {
  display: flex;
  flex-direction: column;
  margin-top: 2px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 30px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.favorite-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .favorite-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.favorite-item.is-selected {
  background-color: rgba(59, 130, 246, 0.1);
}

.dark .favorite-item.is-selected {
  background-color: rgba(59, 130, 246, 0.2);
}

.note-icon,
.note-icon-placeholder {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.note-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.dark .note-title {
  color: #d1d5db;
}

.remove-favorite-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #fbbf24;
  flex-shrink: 0;
  transition: all 0.15s;
  margin-left: auto;
}

.remove-favorite-button:hover {
  color: #f59e0b;
  transform: scale(1.1);
}

.rotate-90 {
  transform: rotate(90deg);
}
</style>
