<template>
  <div v-if="visible" ref="menuRef" class="block-menu" :style="{ top: position.top + 'px', left: position.left + 'px' }">
    <div
      v-for="action in actions"
      :key="action.id"
      class="menu-item"
      @click="handleAction(action)"
    >
      <span class="menu-icon">{{ action.icon }}</span>
      <span class="menu-label">{{ action.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { BlockMenuAction } from '../../types/editor';

const props = defineProps<{
  visible: boolean;
  actions: BlockMenuAction[];
  position: { top: number; left: number };
}>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = ref<HTMLElement | null>(null);

const handleAction = (action: BlockMenuAction) => {
  action.action();
  emit('close');
};

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.block-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  max-width: 280px;
  padding: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-icon {
  flex-shrink: 0;
  font-size: 16px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-label {
  flex: 1;
  font-size: 14px;
  color: #374151;
}
</style>
