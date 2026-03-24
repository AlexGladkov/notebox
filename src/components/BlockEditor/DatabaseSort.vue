<template>
  <div class="database-sort">
    <button
      class="sort-button"
      :class="{ active: modelValue }"
      @click="toggleMenu"
    >
      <svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
      <span>Сортировка</span>
      <span v-if="modelValue" class="active-indicator"></span>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="sort-menu"
      @click.stop
    >
      <div class="menu-header">Сортировка</div>

      <div class="menu-section">
        <label class="menu-label">Колонка</label>
        <select
          v-model="selectedColumnId"
          class="menu-select"
        >
          <option :value="null">Выберите колонку</option>
          <option
            v-for="column in columns"
            :key="column.id"
            :value="column.id"
          >
            {{ column.name }}
          </option>
        </select>
      </div>

      <div v-if="selectedColumnId" class="menu-section">
        <label class="menu-label">Направление</label>
        <div class="direction-buttons">
          <button
            class="direction-button"
            :class="{ active: selectedDirection === 'asc' }"
            @click="selectedDirection = 'asc'"
          >
            <svg class="direction-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
            По возрастанию
          </button>
          <button
            class="direction-button"
            :class="{ active: selectedDirection === 'desc' }"
            @click="selectedDirection = 'desc'"
          >
            <svg class="direction-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            По убыванию
          </button>
        </div>
      </div>

      <div class="menu-actions">
        <button class="menu-button secondary" @click="handleClear">
          Очистить
        </button>
        <button
          class="menu-button primary"
          :disabled="!selectedColumnId"
          @click="handleApply"
        >
          Применить
        </button>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="menuVisible"
      class="menu-overlay"
      @click="closeMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Column } from '../../types';
import type { DatabaseSort } from '../../types/database';

const props = defineProps<{
  modelValue: DatabaseSort | null;
  columns: Column[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DatabaseSort | null];
}>();

const menuVisible = ref(false);
const selectedColumnId = ref<string | null>(props.modelValue?.columnId || null);
const selectedDirection = ref<'asc' | 'desc'>(props.modelValue?.direction || 'asc');

watch(() => props.modelValue, (newValue) => {
  selectedColumnId.value = newValue?.columnId || null;
  selectedDirection.value = newValue?.direction || 'asc';
});

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const closeMenu = () => {
  menuVisible.value = false;
};

const handleApply = () => {
  if (selectedColumnId.value) {
    emit('update:modelValue', {
      columnId: selectedColumnId.value,
      direction: selectedDirection.value,
    });
  }
  closeMenu();
};

const handleClear = () => {
  selectedColumnId.value = null;
  selectedDirection.value = 'asc';
  emit('update:modelValue', null);
  closeMenu();
};
</script>

<style scoped>
.database-sort {
  position: relative;
}

.sort-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  color: #6b7280;
  font-size: 14px;
}

.dark .sort-button {
  background: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

.sort-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.dark .sort-button:hover {
  background: #111827;
  border-color: #4b5563;
  color: #e5e7eb;
}

.sort-button.active {
  border-color: #3b82f6;
  color: #3b82f6;
}

.sort-icon {
  width: 16px;
  height: 16px;
}

.active-indicator {
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
}

/* Menu Styles */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.sort-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  padding: 12px;
}

.dark .sort-menu {
  background: #1f2937;
  border-color: #374151;
}

.menu-header {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
  padding: 0 4px;
}

.dark .menu-header {
  color: #f9fafb;
}

.menu-section {
  margin-bottom: 12px;
}

.menu-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  padding: 0 4px;
}

.dark .menu-label {
  color: #9ca3af;
}

.menu-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #111827;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.dark .menu-select {
  background: #111827;
  border-color: #374151;
  color: #f9fafb;
}

.menu-select:focus {
  border-color: #3b82f6;
}

.direction-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.direction-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  color: #374151;
  font-size: 14px;
  text-align: left;
}

.dark .direction-button {
  background: #111827;
  border-color: #374151;
  color: #e5e7eb;
}

.direction-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.dark .direction-button:hover {
  background: #0f172a;
  border-color: #4b5563;
}

.direction-button.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark .direction-button.active {
  background: #1e3a5f;
  border-color: #3b82f6;
  color: #60a5fa;
}

.direction-icon {
  width: 16px;
  height: 16px;
}

.menu-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.dark .menu-actions {
  border-top-color: #374151;
}

.menu-button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-button.secondary {
  background: #f3f4f6;
  color: #374151;
}

.dark .menu-button.secondary {
  background: #374151;
  color: #e5e7eb;
}

.menu-button.secondary:hover {
  background: #e5e7eb;
}

.dark .menu-button.secondary:hover {
  background: #4b5563;
}

.menu-button.primary {
  background: #3b82f6;
  color: white;
}

.menu-button.primary:hover {
  background: #2563eb;
}

.menu-button.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
