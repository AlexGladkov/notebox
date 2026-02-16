<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      :style="{ top: `${position.y}px`, left: `${position.x}px` }"
      class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
      @click.stop
    >
      <button
        @click="handleClose"
        class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Закрыть
      </button>
      <button
        @click="handleCloseOthers"
        class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Закрыть другие
      </button>
      <button
        @click="handleCloseAll"
        class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Закрыть все
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{
  show: boolean;
  tabId: string | null;
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  close: [];
  closeTab: [tabId: string];
  closeOtherTabs: [tabId: string];
  closeAllTabs: [];
}>();

const menuRef = ref<HTMLElement | null>(null);

const handleClose = () => {
  if (props.tabId) {
    emit('closeTab', props.tabId);
  }
  emit('close');
};

const handleCloseOthers = () => {
  if (props.tabId) {
    emit('closeOtherTabs', props.tabId);
  }
  emit('close');
};

const handleCloseAll = () => {
  emit('closeAllTabs');
  emit('close');
};

// Закрытие при клике вне меню
const handleClickOutside = (event: MouseEvent) => {
  if (props.show && menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
};

// Закрытие при нажатии Escape
const handleEscape = (event: KeyboardEvent) => {
  if (props.show && event.key === 'Escape') {
    emit('close');
  }
};

watch(() => props.show, async (newShow) => {
  if (newShow) {
    await nextTick();
    // Проверяем, не выходит ли меню за пределы экрана
    if (menuRef.value) {
      const rect = menuRef.value.getBoundingClientRect();
      const adjustedPosition = { ...props.position };

      // Корректируем позицию по X
      if (rect.right > window.innerWidth) {
        adjustedPosition.x = window.innerWidth - rect.width - 10;
      }

      // Корректируем позицию по Y
      if (rect.bottom > window.innerHeight) {
        adjustedPosition.y = window.innerHeight - rect.height - 10;
      }

      menuRef.value.style.left = `${adjustedPosition.x}px`;
      menuRef.value.style.top = `${adjustedPosition.y}px`;
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  }
});

onMounted(() => {
  if (props.show) {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
});
</script>
