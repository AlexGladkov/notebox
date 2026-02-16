<template>
  <div class="flex items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Контейнер для вкладок -->
    <div
      ref="tabsContainerRef"
      class="flex-1 flex overflow-x-auto scrollbar-hide"
      style="scrollbar-width: none; -ms-overflow-style: none;"
    >
      <TabItem
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :tab-id="tab.id"
        :title="tab.title"
        :is-active="tab.id === activeTabId"
        @click="handleTabClick"
        @close="handleTabClose"
        @contextmenu="handleTabContextMenu"
        @dragstart="handleDragStart"
        @drop="handleDrop(tab.id, $event)"
      />
    </div>

    <!-- Кнопка overflow menu (показывается при большом количестве вкладок) -->
    <TabOverflowMenu
      v-if="showOverflow"
      :tabs="tabs"
      :active-tab-id="activeTabId"
      @select-tab="handleTabClick"
    />

    <!-- Контекстное меню -->
    <TabContextMenu
      :show="contextMenu.show"
      :tab-id="contextMenu.tabId"
      :position="contextMenu.position"
      @close="closeContextMenu"
      @close-tab="handleTabClose"
      @close-other-tabs="handleCloseOtherTabs"
      @close-all-tabs="handleCloseAllTabs"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Tab } from '../composables/useTabs';
import TabItem from './TabItem.vue';
import TabContextMenu from './TabContextMenu.vue';
import TabOverflowMenu from './TabOverflowMenu.vue';

const props = defineProps<{
  tabs: Tab[];
  activeTabId: string | null;
}>();

const emit = defineEmits<{
  selectTab: [tabId: string];
  closeTab: [tabId: string];
  closeOtherTabs: [tabId: string];
  closeAllTabs: [];
  moveTab: [fromIndex: number, toIndex: number];
}>();

const tabsContainerRef = ref<HTMLElement | null>(null);
const showOverflow = ref(false);
const draggedTabId = ref<string | null>(null);

const contextMenu = reactive({
  show: false,
  tabId: null as string | null,
  position: { x: 0, y: 0 },
});

// Проверяем, нужен ли overflow menu
const checkOverflow = () => {
  if (!tabsContainerRef.value) return;

  const container = tabsContainerRef.value;
  const hasOverflow = container.scrollWidth > container.clientWidth;

  // Показываем overflow menu, если вкладок много (примерно больше 8-10 на экране)
  showOverflow.value = hasOverflow || props.tabs.length > 8;
};

// Обработка клика по вкладке
const handleTabClick = (tabId: string) => {
  emit('selectTab', tabId);
};

// Обработка закрытия вкладки
const handleTabClose = (tabId: string) => {
  emit('closeTab', tabId);
};

// Обработка контекстного меню
const handleTabContextMenu = (tabId: string, event: MouseEvent) => {
  contextMenu.show = true;
  contextMenu.tabId = tabId;
  contextMenu.position = { x: event.clientX, y: event.clientY };
};

const closeContextMenu = () => {
  contextMenu.show = false;
  contextMenu.tabId = null;
};

const handleCloseOtherTabs = (tabId: string) => {
  emit('closeOtherTabs', tabId);
};

const handleCloseAllTabs = () => {
  emit('closeAllTabs');
};

// Drag & Drop
const handleDragStart = (tabId: string, event: DragEvent) => {
  draggedTabId.value = tabId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tabId);
  }
};

const handleDrop = (targetTabId: string, event: DragEvent) => {
  event.preventDefault();

  if (!draggedTabId.value || draggedTabId.value === targetTabId) {
    draggedTabId.value = null;
    return;
  }

  const fromIndex = props.tabs.findIndex(t => t.id === draggedTabId.value);
  const toIndex = props.tabs.findIndex(t => t.id === targetTabId);

  if (fromIndex !== -1 && toIndex !== -1) {
    emit('moveTab', fromIndex, toIndex);
  }

  draggedTabId.value = null;
};

// Следим за изменениями размера и количества вкладок
watch(() => props.tabs.length, () => {
  checkOverflow();
});

onMounted(() => {
  checkOverflow();
  window.addEventListener('resize', checkOverflow);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOverflow);
});
</script>

<style scoped>
/* Скрываем скроллбар для Firefox */
.scrollbar-hide {
  scrollbar-width: none;
}

/* Скрываем скроллбар для WebKit браузеров */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
