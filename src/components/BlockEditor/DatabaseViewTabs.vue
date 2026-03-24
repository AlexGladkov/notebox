<template>
  <div class="view-tabs">
    <div class="tabs-container">
      <button
        v-for="view in views"
        :key="view.id"
        class="tab"
        :class="{ active: view.id === currentViewId }"
        @click="$emit('select-view', view.id)"
        @contextmenu.prevent="handleContextMenu($event, view.id)"
      >
        <span class="tab-name">{{ view.name }}</span>
      </button>
      <button class="tab tab-add" @click="handleCreateView" title="Добавить вьюху">
        <span class="tab-icon">+</span>
      </button>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        top: contextMenu.y + 'px',
        left: contextMenu.x + 'px',
      }"
      @click="closeContextMenu"
    >
      <div class="context-menu-item" @click="handleRenameView">
        <span class="context-menu-icon">✏️</span>
        <span>Переименовать</span>
      </div>
      <div
        class="context-menu-item delete"
        @click="handleDeleteView"
        :class="{ disabled: views.length <= 1 }"
      >
        <span class="context-menu-icon">🗑️</span>
        <span>Удалить</span>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="contextMenu.visible"
      class="context-menu-overlay"
      @click="closeContextMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DatabaseView } from '../../types/database';

const props = defineProps<{
  views: DatabaseView[];
  currentViewId: string;
}>();

const emit = defineEmits<{
  'select-view': [viewId: string];
  'create-view': [];
  'rename-view': [viewId: string];
  'delete-view': [viewId: string];
}>();

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  viewId: null as string | null,
});

const handleCreateView = () => {
  emit('create-view');
};

const handleContextMenu = (event: MouseEvent, viewId: string) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    viewId,
  };
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.viewId = null;
};

const handleRenameView = () => {
  if (contextMenu.value.viewId) {
    emit('rename-view', contextMenu.value.viewId);
  }
  closeContextMenu();
};

const handleDeleteView = () => {
  if (props.views.length <= 1) {
    closeContextMenu();
    return;
  }
  if (contextMenu.value.viewId) {
    emit('delete-view', contextMenu.value.viewId);
  }
  closeContextMenu();
};
</script>

<style scoped>
.view-tabs {
  position: relative;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.dark .view-tabs {
  background: #1f2937;
  border-bottom-color: #374151;
}

.tabs-container {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  transition: all 0.15s ease;
  color: #6b7280;
  font-size: 14px;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.dark .tab {
  color: #9ca3af;
}

.tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .tab:hover {
  background: #374151;
  color: #e5e7eb;
}

.tab.active {
  color: #111827;
  border-bottom-color: #3b82f6;
}

.dark .tab.active {
  color: #f9fafb;
  border-bottom-color: #3b82f6;
}

.tab-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-add {
  padding: 6px 8px;
  color: #9ca3af;
}

.tab-add:hover {
  color: #3b82f6;
  background: #eff6ff;
}

.dark .tab-add:hover {
  color: #60a5fa;
  background: #1e3a5f;
}

.tab-icon {
  font-size: 16px;
  line-height: 1;
}

/* Context Menu */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1001;
}

.context-menu {
  position: fixed;
  z-index: 1002;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 180px;
}

.dark .context-menu {
  background: #1f2937;
  border-color: #374151;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  color: #374151;
}

.dark .context-menu-item {
  color: #e5e7eb;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.dark .context-menu-item:hover {
  background: #374151;
}

.context-menu-item.delete {
  color: #dc2626;
}

.dark .context-menu-item.delete {
  color: #f87171;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: none;
}

.context-menu-icon {
  font-size: 16px;
}
</style>
