<template>
  <div class="folder-item">
    <div
      :class="[
        'flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group rounded-md text-gray-800 dark:text-gray-100',
        { 'bg-blue-50 dark:bg-blue-900': isSelected }
      ]"
      @click="handleSelect"
    >
      <button
        v-if="hasChildren"
        @click.stop="toggleExpanded"
        class="flex-shrink-0 w-4 h-4 flex items-center justify-center"
      >
        <svg
          :class="['w-3 h-3 transition-transform', { 'rotate-90': isExpanded }]"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      <div v-else class="w-4"></div>

      <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>

      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="editName"
        @click.stop
        @blur="handleRename"
        @keydown.enter="handleRename"
        @keydown.esc="cancelEdit"
        class="flex-1 px-1 border border-blue-500 rounded outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <span v-else class="flex-1 truncate text-sm">{{ folder.name }}</span>

      <div class="hidden group-hover:flex items-center gap-1">
        <button
          @click.stop="startEdit"
          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Переименовать"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click.stop="$emit('createSubfolder')"
          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Создать подпапку"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          @click.stop="$emit('delete')"
          class="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
          title="Удалить"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isExpanded && hasChildren" class="ml-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Folder } from '../types';

const props = defineProps<{
  folder: Folder;
  isSelected: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  select: [];
  rename: [name: string];
  delete: [];
  createSubfolder: [];
  toggleExpand: [];
}>();

const isEditing = ref(false);
const editName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const handleSelect = () => {
  if (!isEditing.value) {
    emit('select');
  }
};

const toggleExpanded = () => {
  emit('toggleExpand');
};

const startEdit = () => {
  isEditing.value = true;
  editName.value = props.folder.name;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
};

const handleRename = () => {
  if (editName.value.trim() && editName.value !== props.folder.name) {
    emit('rename', editName.value.trim());
  }
  isEditing.value = false;
};

const cancelEdit = () => {
  isEditing.value = false;
  editName.value = props.folder.name;
};
</script>
