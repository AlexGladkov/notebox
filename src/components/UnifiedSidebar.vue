<template>
  <div class="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
    <!-- Поиск -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <SearchBar v-model="searchQuery" />
    </div>

    <!-- Список страниц -->
    <div class="flex-1 overflow-y-auto p-2">
      <!-- Результаты поиска -->
      <div v-if="searchQuery" class="space-y-1">
        <div
          v-for="note in searchResults"
          :key="note.id"
          @click="$emit('selectNote', note.id)"
          :class="[
            'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md',
            { 'bg-blue-50 dark:bg-blue-900': selectedNoteId === note.id }
          ]"
        >
          <div class="flex items-center gap-2">
            <span v-if="note.icon" class="text-sm">{{ note.icon }}</span>
            <div class="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
              {{ note.title || 'Без названия' }}
            </div>
          </div>
        </div>
        <div v-if="searchResults.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Ничего не найдено
        </div>
      </div>

      <!-- Древовидный список всех страниц -->
      <div v-else>
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Страницы</span>
          <button
            @click="$emit('createRootPage')"
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            title="Создать страницу"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <NoteTree
          v-if="rootNotes.length > 0"
          :notes="rootNotes"
          :all-notes="allNotes"
          :selected-note-id="selectedNoteId"
          :expanded-notes="expandedNotes"
          @select-note="(id, forceNewTab) => $emit('selectNote', id, forceNewTab)"
          @create-subpage="(id) => $emit('createSubpage', id)"
          @toggle-expand="(id) => $emit('toggleExpand', id)"
        />

        <div v-else class="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Создайте первую страницу
        </div>
      </div>
    </div>

    <!-- Переключатель темы -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <button
        @click="cycleTheme"
        class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        :title="themeTooltip"
        aria-label="Переключить тему"
      >
        <!-- Иконка солнца (светлая тема) -->
        <svg
          v-if="themeMode === 'light'"
          class="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        <!-- Иконка луны (тёмная тема) -->
        <svg
          v-else-if="themeMode === 'dark'"
          class="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>

        <!-- Иконка монитора (системная тема) -->
        <svg
          v-else
          class="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>

        <span class="text-sm text-gray-700 dark:text-gray-300">{{ themeTooltip }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '../types';
import { useTheme } from '../composables/useTheme';
import SearchBar from './SearchBar.vue';
import NoteTree from './NoteTree.vue';

const props = defineProps<{
  allNotes: Note[];
  searchQuery: string;
  selectedNoteId: string | null;
  expandedNotes: Set<string>;
  searchResults: Note[];
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  selectNote: [id: string, forceNewTab: boolean];
  createRootPage: [];
  createSubpage: [parentId: string];
  toggleExpand: [id: string];
}>();

// Переключатель темы
const { themeMode, cycleTheme } = useTheme();

const themeTooltip = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return 'Светлая тема';
    case 'dark':
      return 'Тёмная тема';
    case 'system':
      return 'Системная тема';
    default:
      return 'Переключить тему';
  }
});

const searchQuery = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value),
});

const rootNotes = computed(() =>
  props.allNotes.filter(n => !n.parentId)
    .sort((a, b) => a.title.localeCompare(b.title))
);
</script>
