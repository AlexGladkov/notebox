<template>
  <div
    :class="[
      'relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors min-w-[120px] max-w-[200px] border-r border-gray-200 dark:border-gray-700',
      {
        'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100': isActive,
        'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750': !isActive
      }
    ]"
    :draggable="true"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @dragstart="handleDragStart"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Название вкладки -->
    <span class="flex-1 truncate text-sm">{{ title }}</span>

    <!-- Кнопка закрытия (появляется при hover) -->
    <button
      v-show="isHovered || isActive"
      @click.stop="handleClose"
      class="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
      title="Закрыть"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  tabId: string;
  title: string;
  isActive: boolean;
}>();

const emit = defineEmits<{
  click: [tabId: string];
  close: [tabId: string];
  contextmenu: [tabId: string, event: MouseEvent];
  dragstart: [tabId: string, event: DragEvent];
  drop: [tabId: string, event: DragEvent];
}>();

const isHovered = ref(false);

const handleClick = () => {
  emit('click', props.tabId);
};

const handleClose = () => {
  emit('close', props.tabId);
};

const handleContextMenu = (event: MouseEvent) => {
  emit('contextmenu', props.tabId, event);
};

const handleDragStart = (event: DragEvent) => {
  emit('dragstart', props.tabId, event);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDrop = (event: DragEvent) => {
  emit('drop', props.tabId, event);
};
</script>
