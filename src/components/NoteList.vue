<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900">
    <div class="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
        {{ folderName || 'Папка' }}
      </h2>
      <button
        @click="$emit('createNote')"
        class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Новая заметка
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="notes.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        <EmptyState message="Нет заметок в этой папке" />
      </div>

      <NoteTree
        v-else
        :notes="rootNotes"
        :all-notes="notes"
        :selected-note-id="selectedNoteId"
        :expanded-notes="expandedNotes"
        @select-note="handleNoteSelect"
        @create-subpage="handleCreateSubpage"
        @toggle-expand="handleToggleExpand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '../types';
import EmptyState from './EmptyState.vue';
import NoteTree from './NoteTree.vue';

const props = defineProps<{
  notes: Note[];
  folderName: string | undefined;
  selectedNoteId: string | null;
  expandedNotes?: Set<string>;
}>();

const emit = defineEmits<{
  createNote: [];
  selectNote: [id: string, forceNewTab: boolean];
  deleteNote: [id: string];
  createSubpage: [parentId: string];
  toggleExpand: [noteId: string];
}>();

const rootNotes = computed(() => {
  return props.notes.filter(n => !n.parentId);
});

const handleNoteSelect = (noteId: string, forceNewTab: boolean) => {
  emit('selectNote', noteId, forceNewTab);
};

const handleCreateSubpage = (parentId: string) => {
  emit('createSubpage', parentId);
};

const handleToggleExpand = (noteId: string) => {
  emit('toggleExpand', noteId);
};
</script>
