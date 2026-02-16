<template>
  <div v-if="note" class="h-full flex flex-col bg-white dark:bg-gray-900">
    <div class="border-b border-gray-200 dark:border-gray-700 p-4">
      <input
        v-model="localTitle"
        @input="handleTitleChange"
        placeholder="Название заметки..."
        class="w-full text-2xl font-semibold outline-none border-none focus:ring-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
      />
      <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Изменено: {{ formatDate(note.updatedAt) }}
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <BlockEditor
        v-model="localContent"
        @update:model-value="handleContentChange"
      />
    </div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <EmptyState message="Выберите заметку для редактирования" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Note } from '../types';
import EmptyState from './EmptyState.vue';
import BlockEditor from './BlockEditor.vue';

const props = defineProps<{
  note: Note | undefined;
}>();

const emit = defineEmits<{
  updateNote: [updates: { title?: string; content?: string }];
}>();

const localTitle = ref('');
const localContent = ref('');
let debounceTimer: number | null = null;

watch(
  () => props.note,
  (newNote) => {
    if (newNote) {
      localTitle.value = newNote.title;
      localContent.value = newNote.content;
    } else {
      localTitle.value = '';
      localContent.value = '';
    }
  },
  { immediate: true }
);

const handleTitleChange = () => {
  debounceUpdate({ title: localTitle.value });
};

const handleContentChange = (content: string) => {
  localContent.value = content;
  debounceUpdate({ content });
};

const debounceUpdate = (updates: { title?: string; content?: string }) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    emit('updateNote', updates);
  }, 500);
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>
