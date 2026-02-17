<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Переместить заметку
      </h3>

      <div class="flex-1 overflow-y-auto mb-6 border border-gray-200 dark:border-gray-600 rounded-md p-4">
        <div class="space-y-1">
          <div
            @click="selectTarget(null)"
            :class="[
              'p-2 rounded-md cursor-pointer transition-colors',
              selectedTarget === null
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <div class="font-medium text-gray-900 dark:text-gray-100">
              Корневой уровень
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Переместить на верхний уровень папки
            </div>
          </div>

          <div
            v-for="note in selectableNotes"
            :key="note.id"
            @click="selectTarget(note.id)"
            :class="[
              'p-2 rounded-md cursor-pointer transition-colors flex items-center gap-2',
              selectedTarget === note.id
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700',
              isDisabled(note.id) && 'opacity-50 cursor-not-allowed'
            ]"
          >
            <span v-if="note.icon" class="text-lg">{{ note.icon }}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ note.title || 'Без названия' }}
              </div>
              <div v-if="isDisabled(note.id)" class="text-xs text-red-500 dark:text-red-400">
                Нельзя переместить в саму себя или потомка
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="validationError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p class="text-sm text-red-600 dark:text-red-400">
          {{ validationError }}
        </p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Отмена
        </button>
        <button
          @click="handleConfirm"
          :disabled="validationError !== null"
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Переместить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Note } from '../types';

const props = defineProps<{
  show: boolean;
  noteId: string;
  allNotes: Note[];
}>();

const emit = defineEmits<{
  confirm: [targetParentId: string | null];
  cancel: [];
}>();

const selectedTarget = ref<string | null>(null);

watch(() => props.show, (newShow) => {
  if (newShow) {
    selectedTarget.value = null;
  }
});

const currentNote = computed(() => {
  return props.allNotes.find(n => n.id === props.noteId);
});

const descendants = computed(() => {
  const result: Set<string> = new Set();
  const queue = [props.noteId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = props.allNotes.filter(n => n.parentId === current);
    children.forEach(child => {
      result.add(child.id);
      queue.push(child.id);
    });
  }

  return result;
});

const selectableNotes = computed(() => {
  return props.allNotes
    .filter(n => n.id !== props.noteId && n.folderId === currentNote.value?.folderId)
    .sort((a, b) => a.title.localeCompare(b.title));
});

const isDisabled = (noteId: string): boolean => {
  return noteId === props.noteId || descendants.value.has(noteId);
};

const getDepth = (noteId: string | null): number => {
  let depth = 0;
  let currentId = noteId;

  while (currentId !== null) {
    const note = props.allNotes.find(n => n.id === currentId);
    if (!note) break;
    depth++;
    currentId = note.parentId ?? null;
  }

  return depth;
};

const getMaxDescendantDepth = (noteId: string): number => {
  const children = props.allNotes.filter(n => n.parentId === noteId);
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map(child => getMaxDescendantDepth(child.id)));
};

const validationError = computed(() => {
  if (selectedTarget.value === null) return null;

  if (isDisabled(selectedTarget.value)) {
    return 'Нельзя переместить заметку в саму себя или её потомка';
  }

  const targetDepth = getDepth(selectedTarget.value);
  const noteDepth = getMaxDescendantDepth(props.noteId);

  if (targetDepth + noteDepth > 3) {
    return 'Перемещение превысит максимальную глубину вложенности (3 уровня)';
  }

  return null;
});

const selectTarget = (targetId: string | null) => {
  if (targetId !== null && isDisabled(targetId)) return;
  selectedTarget.value = targetId;
};

const handleConfirm = () => {
  if (validationError.value) return;
  emit('confirm', selectedTarget.value);
};
</script>
