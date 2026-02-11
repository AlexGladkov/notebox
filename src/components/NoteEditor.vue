<template>
  <div v-if="note" class="h-full flex flex-col bg-white">
    <div class="border-b border-gray-200 p-4">
      <input
        v-model="localTitle"
        @input="handleTitleChange"
        placeholder="Название заметки..."
        class="w-full text-2xl font-semibold outline-none border-none focus:ring-0"
      />
      <div class="text-sm text-gray-500 mt-2">
        Изменено: {{ formatDate(note.updatedAt) }}
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div class="flex-1 flex flex-col border-r border-gray-200">
        <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          Редактор
        </div>
        <textarea
          v-model="localContent"
          @input="handleContentChange"
          placeholder="Начните писать... (поддерживается Markdown)"
          class="flex-1 p-4 outline-none resize-none font-mono text-sm"
        />
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          Превью
        </div>
        <div
          class="flex-1 p-4 overflow-y-auto prose prose-sm max-w-none"
          v-html="renderedContent"
        />
      </div>
    </div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <EmptyState message="Выберите заметку для редактирования" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Note } from '../types';
import { renderMarkdown } from '../utils/markdown';
import EmptyState from './EmptyState.vue';

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

const renderedContent = computed(() => {
  return renderMarkdown(localContent.value);
});

const handleTitleChange = () => {
  debounceUpdate({ title: localTitle.value });
};

const handleContentChange = () => {
  debounceUpdate({ content: localContent.value });
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

<style>
.prose {
  color: #374151;
}

.prose h1 {
  font-size: 2em;
  font-weight: 700;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose p {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose ul,
.prose ol {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 1.5em;
}

.prose code {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-size: 0.9em;
}

.prose pre {
  background-color: #f3f4f6;
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
}

.prose blockquote {
  border-left: 4px solid #e5e7eb;
  padding-left: 1em;
  color: #6b7280;
  margin: 0.5em 0;
}

.prose a {
  color: #2563eb;
  text-decoration: underline;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5em;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5em 0;
}

.prose th,
.prose td {
  border: 1px solid #e5e7eb;
  padding: 0.5em;
}

.prose th {
  background-color: #f3f4f6;
  font-weight: 600;
}
</style>
