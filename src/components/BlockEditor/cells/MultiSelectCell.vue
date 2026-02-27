<template>
  <div class="multi-select-cell" @click="toggleMenu">
    <div v-if="selectedOptions.length > 0" class="select-tags">
      <span
        v-for="option in selectedOptions"
        :key="option.id"
        class="select-tag"
        :style="{ backgroundColor: option.color || '#e5e7eb' }"
        @click.stop="removeOption(option.id)"
      >
        {{ option.label }}
        <span class="remove-icon">×</span>
      </span>
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
          :class="{ active: isSelected(option.id) }"
          @click="toggleOption(option.id)"
        >
          <input
            type="checkbox"
            :checked="isSelected(option.id)"
            class="option-checkbox"
            @click.stop
          />
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
  value: string[] | null;
  column: Column;
}>();

const emit = defineEmits<{
  update: [value: string[]];
}>();

const menuVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const colorPalette = ['#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#a7f3d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#f5d0fe', '#fecdd3'];

const options = computed(() => props.column.options || []);

const selectedValues = computed(() => props.value || []);

const selectedOptions = computed(() => {
  return options.value.filter(opt => selectedValues.value.includes(opt.id));
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

const isSelected = (optionId: string) => {
  return selectedValues.value.includes(optionId);
};

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

const toggleOption = (optionId: string) => {
  const currentValues = [...selectedValues.value];
  const index = currentValues.indexOf(optionId);

  if (index > -1) {
    currentValues.splice(index, 1);
  } else {
    currentValues.push(optionId);
  }

  emit('update', currentValues);
};

const removeOption = (optionId: string) => {
  const currentValues = selectedValues.value.filter(id => id !== optionId);
  emit('update', currentValues);
};

const createOption = () => {
  if (!searchQuery.value.trim()) return;

  // Create new option with random color
  const newOption: SelectOption = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: searchQuery.value.trim(),
    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
  };

  // Add to column options
  if (!props.column.options) {
    props.column.options = [];
  }
  props.column.options.push(newOption);

  // Add to selection
  const currentValues = [...selectedValues.value, newOption.id];
  emit('update', currentValues);

  searchQuery.value = '';
};
</script>

<style scoped>
.multi-select-cell {
  width: 100%;
  min-height: 20px;
  cursor: pointer;
  position: relative;
}

.select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.select-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
}

.remove-icon {
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
}

.remove-icon:hover {
  opacity: 1;
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

.option-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
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
