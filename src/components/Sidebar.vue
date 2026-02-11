<template>
  <div class="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <SearchBar v-model="searchQuery" />
    </div>

    <div class="flex-1 overflow-y-auto p-2">
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
          <div class="text-sm font-medium truncate text-gray-800 dark:text-gray-100">{{ note.title }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ getFolderPath(note.folderId) }}
          </div>
        </div>
        <div v-if="searchResults.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Ничего не найдено
        </div>
      </div>

      <div v-else>
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Папки</span>
          <button
            @click="$emit('createRootFolder')"
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            title="Создать папку"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <FolderTree
          :folders="rootFolders"
          :selected-folder-id="selectedFolderId"
          :expanded-folders="expandedFolders"
          @select-folder="$emit('selectFolder', $event)"
          @rename-folder="(id, name) => $emit('renameFolder', id, name)"
          @delete-folder="$emit('deleteFolder', $event)"
          @create-subfolder="$emit('createSubfolder', $event)"
          @toggle-expand="toggleFolder"
        />

        <div v-if="rootFolders.length === 0" class="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Создайте первую папку
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Folder, Note } from '../types';
import SearchBar from './SearchBar.vue';
import FolderTree from './FolderTree.vue';

const props = defineProps<{
  folders: Folder[];
  searchQuery: string;
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  expandedFolders: Set<string>;
  searchResults: Note[];
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  selectFolder: [id: string];
  selectNote: [id: string];
  createRootFolder: [];
  createSubfolder: [parentId: string];
  renameFolder: [id: string, name: string];
  deleteFolder: [id: string];
  toggleExpand: [id: string];
}>();

const searchQuery = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value),
});

const rootFolders = computed(() =>
  props.folders.filter(f => f.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
);

const toggleFolder = (id: string) => {
  emit('toggleExpand', id);
};

const getFolderPath = (folderId: string): string => {
  const path: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = props.folders.find(f => f.id === currentId);
    if (folder) {
      path.unshift(folder.name);
      currentId = folder.parentId;
    } else {
      break;
    }
  }

  return path.join(' / ');
};
</script>

<script lang="ts">
import { computed } from 'vue';
export default {
  name: 'Sidebar',
};
</script>
