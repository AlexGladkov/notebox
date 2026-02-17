<template>
  <div class="note-tree">
    <div
      v-for="note in sortedNotes"
      :key="note.id"
      class="note-tree-item"
    >
      <div
        :class="[
          'note-item-content',
          { 'is-selected': selectedNoteId === note.id },
          { 'has-children': hasChildren(note.id) }
        ]"
        :style="{ paddingLeft: `${depth * 16}px` }"
        @click="handleNoteClick(note.id, $event)"
        @mouseenter="hoveredNoteId = note.id"
        @mouseleave="hoveredNoteId = null"
      >
        <button
          v-if="hasChildren(note.id)"
          @click.stop="toggleExpand(note.id)"
          class="expand-button"
        >
          <svg
            class="w-3 h-3 transition-transform"
            :class="{ 'rotate-90': expandedNotes.has(note.id) }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span v-else class="expand-placeholder"></span>

        <span v-if="note.icon" class="note-icon">{{ note.icon }}</span>
        <span class="note-title">{{ note.title || 'Без названия' }}</span>

        <button
          v-if="hoveredNoteId === note.id"
          @click.stop="$emit('createSubpage', note.id)"
          class="add-subpage-button"
          title="Создать подстраницу"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <NoteTree
        v-if="expandedNotes.has(note.id) && hasChildren(note.id)"
        :notes="getChildren(note.id)"
        :all-notes="allNotes"
        :selected-note-id="selectedNoteId"
        :expanded-notes="expandedNotes"
        :depth="depth + 1"
        @select-note="(id, forceNewTab) => $emit('selectNote', id, forceNewTab)"
        @create-subpage="(id) => $emit('createSubpage', id)"
        @toggle-expand="(id) => $emit('toggleExpand', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Note } from '../types';

const props = withDefaults(defineProps<{
  notes: Note[];
  allNotes: Note[];
  selectedNoteId: string | null;
  expandedNotes: Set<string>;
  depth?: number;
}>(), {
  depth: 0
});

const emit = defineEmits<{
  selectNote: [id: string, forceNewTab: boolean];
  createSubpage: [parentId: string];
  toggleExpand: [id: string];
}>();

const hoveredNoteId = ref<string | null>(null);

const sortedNotes = computed(() => {
  return [...props.notes].sort((a, b) => a.title.localeCompare(b.title));
});

const getChildren = (parentId: string): Note[] => {
  return props.allNotes.filter(n => n.parentId === parentId);
};

const hasChildren = (noteId: string): boolean => {
  return props.allNotes.some(n => n.parentId === noteId);
};

const toggleExpand = (noteId: string) => {
  emit('toggleExpand', noteId);
};

const handleNoteClick = (noteId: string, event: MouseEvent) => {
  const forceNewTab = event.ctrlKey || event.metaKey;
  emit('selectNote', noteId, forceNewTab);
};
</script>

<style scoped>
.note-tree {
  display: flex;
  flex-direction: column;
}

.note-tree-item {
  display: flex;
  flex-direction: column;
}

.note-item-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s;
  position: relative;
}

.note-item-content:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .note-item-content:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.note-item-content.is-selected {
  background-color: rgba(59, 130, 246, 0.1);
}

.dark .note-item-content.is-selected {
  background-color: rgba(59, 130, 246, 0.2);
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

.expand-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.note-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.note-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #374151;
}

.dark .note-title {
  color: #d1d5db;
}

.add-subpage-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  flex-shrink: 0;
  transition: all 0.15s;
  margin-left: auto;
}

.dark .add-subpage-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: #9ca3af;
}

.add-subpage-button:hover {
  background-color: #3b82f6;
  color: white;
}

.dark .add-subpage-button:hover {
  background-color: #3b82f6;
  color: white;
}

.rotate-90 {
  transform: rotate(90deg);
}
</style>
