<template>
  <div class="select-cell" @click="toggleMenu">
    <div v-if="selectedOption" class="select-tag" :style="{ backgroundColor: selectedOption.color || '#e5e7eb' }">
      {{ selectedOption.label }}
    </div>
    <span v-else class="cell-value empty">Выберите</span>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="select-menu"
      @click.stop
    >
      <input
        v-model="searchQuery"
        ref="searchInput"
        class="menu-search"
        placeholder="Поиск или создать..."
        @keydown.enter="createOption"
      />

      <div class="menu-options">
        <div
          v-for="option in filteredOptions"
          :key="option.id"
          class="menu-option"
          :class="{ active: option.id === value }"
          @click="selectOption(option.id)"
        >
          <span class="option-tag" :style="{ backgroundColor: option.color }">
            {{ option.label }}
          </span>
        </div>

        <div v-if="searchQuery && !exactMatchExists" class="menu-option create" @click="createOption">
          <span class="create-icon">+</span>
          <span>Создать "{{ searchQuery }}"</span>
        </div>
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
import { ref, computed, nextTick } from 'vue';
import type { Column, SelectOption } from '../../../types';

const props = defineProps<{
  value: string | null;
  column: Column;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

const menuVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

import { TAG_COLOR_PALETTE } from '../../../types/database';

// Extract light colors for the palette
const colorPalette = TAG_COLOR_PALETTE.map(c => c.light);

const options = computed(() => props.column.options || []);

const selectedOption = computed(() => {
  if (!props.value) return null;
  return options.value.find(opt => opt.id === props.value) || null;
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return options.value;
  }
  const query = searchQuery.value.toLowerCase();
  return options.value.filter(opt => opt.label.toLowerCase().includes(query));
});

const exactMatchExists = computed(() => {
  return options.value.some(opt => opt.label.toLowerCase() === searchQuery.value.toLowerCase());
});

const toggleMenu = async () => {
  menuVisible.value = !menuVisible.value;
  if (menuVisible.value) {
    searchQuery.value = '';
    await nextTick();
    searchInput.value?.focus();
  }
};

const closeMenu = () => {
  menuVisible.value = false;
  searchQuery.value = '';
};

const selectOption = (optionId: string) => {
  emit('update', optionId);
  closeMenu();
};

const createOption = () => {
  if (!searchQuery.value.trim()) return;

  // Get next color from palette (cycle through colors)
  const nextColorIndex = (props.column.options?.length || 0) % colorPalette.length;
  const newOption: SelectOption = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    label: searchQuery.value.trim(),
    color: colorPalette[nextColorIndex],
  };

  // WORKAROUND: Temporarily mutate props to make it work
  // TODO: This should be refactored to emit an event to update the column via the parent component
  // The proper way would be: emit('create-option', newOption) and handle it in DatabaseTable
  if (!props.column.options) {
    // Create a new array to avoid direct mutation
    (props.column as any).options = [];
  }
  props.column.options!.push(newOption);

  // Select the new option
  emit('update', newOption.id);
  closeMenu();
};
</script>

<style scoped>
.select-cell {
  width: 100%;
  min-height: 20px;
  cursor: pointer;
  position: relative;
}

.select-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
}

.cell-value.empty {
  color: #d1d5db;
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

.select-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  max-width: 300px;
}

.menu-search {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 12px;
  outline: none;
  font-size: 14px;
}

.menu-options {
  max-height: 250px;
  overflow-y: auto;
  padding: 4px;
}

.menu-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.menu-option:hover {
  background: #f3f4f6;
}

.menu-option.active {
  background: #eff6ff;
}

.menu-option.create {
  color: #3b82f6;
  font-weight: 500;
}

.option-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
}

.create-icon {
  font-size: 18px;
  font-weight: 600;
}
</style>
