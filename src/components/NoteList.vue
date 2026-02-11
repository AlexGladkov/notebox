<template>
  <div class="h-full flex flex-col bg-white">
    <div class="border-b border-gray-200 p-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">
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

    <div class="flex-1 overflow-y-auto">
      <div v-if="notes.length === 0" class="p-8 text-center text-gray-500">
        <EmptyState message="Нет заметок в этой папке" />
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="note in notes"
          :key="note.id"
          @click="$emit('selectNote', note.id)"
          :class="[
            'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
            { 'bg-blue-50': selectedNoteId === note.id }
          ]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 truncate">{{ note.title }}</h3>
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">
                {{ getPreview(note.content) }}
              </p>
              <p class="text-xs text-gray-400 mt-2">
                {{ formatDate(note.updatedAt) }}
              </p>
            </div>
            <button
              @click.stop="$emit('deleteNote', note.id)"
              class="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Удалить заметку"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '../types';
import EmptyState from './EmptyState.vue';

defineProps<{
  notes: Note[];
  folderName: string | undefined;
  selectedNoteId: string | null;
}>();

defineEmits<{
  createNote: [];
  selectNote: [id: string];
  deleteNote: [id: string];
}>();

const getPreview = (content: string): string => {
  if (!content) return 'Пустая заметка';
  return content.replace(/[#*_~`\[\]]/g, '').substring(0, 100);
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMinutes < 1) return 'Только что';
  if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
  if (diffInHours < 24) return `${diffInHours} ч назад`;
  if (diffInDays < 7) return `${diffInDays} дн назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
</script>
