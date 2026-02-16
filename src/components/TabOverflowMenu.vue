<template>
  <div class="relative">
    <!-- Кнопка "..." -->
    <button
      ref="buttonRef"
      @click="toggleMenu"
      class="flex items-center justify-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-r border-gray-200 dark:border-gray-700"
      title="Показать все вкладки"
    >
      <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>

    <!-- Выпадающее меню -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyle"
        class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 max-h-96 overflow-y-auto min-w-[200px] max-w-[300px]"
        @click.stop
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="handleSelectTab(tab.id)"
          :class="[
            'w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2',
            {
              'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300': tab.id === activeTabId,
              'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700': tab.id !== activeTabId
            }
          ]"
        >
          <span class="truncate">{{ tab.title }}</span>
          <svg
            v-if="tab.id === activeTabId"
            class="w-4 h-4 flex-shrink-0 ml-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { Tab } from '../composables/useTabs';

const props = defineProps<{
  tabs: Tab[];
  activeTabId: string | null;
}>();

const emit = defineEmits<{
  selectTab: [tabId: string];
}>();

const isOpen = ref(false);
const buttonRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const menuStyle = ref({});

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const handleSelectTab = (tabId: string) => {
  emit('selectTab', tabId);
  isOpen.value = false;
};

// Закрытие при клике вне меню
const handleClickOutside = (event: MouseEvent) => {
  if (
    isOpen.value &&
    menuRef.value &&
    buttonRef.value &&
    !menuRef.value.contains(event.target as Node) &&
    !buttonRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
  }
};

// Закрытие при нажатии Escape
const handleEscape = (event: KeyboardEvent) => {
  if (isOpen.value && event.key === 'Escape') {
    isOpen.value = false;
  }
};

// Позиционирование меню
const updateMenuPosition = async () => {
  if (!isOpen.value || !buttonRef.value) return;

  await nextTick();

  const buttonRect = buttonRef.value.getBoundingClientRect();
  const menuWidth = 200;
  const menuMaxHeight = 384; // max-h-96 = 24rem = 384px

  let top = buttonRect.bottom + 4;
  let left = buttonRect.left;

  // Корректируем позицию по X (чтобы не выходило за правый край)
  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 10;
  }

  // Корректируем позицию по Y (чтобы не выходило за нижний край)
  if (top + menuMaxHeight > window.innerHeight) {
    top = buttonRect.top - menuMaxHeight - 4;
    // Если и сверху не помещается, показываем снизу, но ограничиваем высоту
    if (top < 0) {
      top = buttonRect.bottom + 4;
    }
  }

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};

watch(isOpen, async (newValue) => {
  if (newValue) {
    await updateMenuPosition();
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  }
});

onMounted(() => {
  if (isOpen.value) {
    updateMenuPosition();
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
});
</script>
