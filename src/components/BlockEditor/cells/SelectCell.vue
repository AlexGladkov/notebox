<template>
  <div class="select-cell" @click="toggleMenu">
    <div v-if="selectedOption" class="select-tag" :style="getOptionStyle(selectedOption.color || 'gray')">
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
          <span class="option-tag" :style="getOptionStyle(option.color)">
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
import { TAG_COLOR_PALETTE } from '../../../types/database';
import { useTheme } from '../../../composables/useTheme';

const props = defineProps<{
  value: string | null;
  column: Column;
}>();

const emit = defineEmits<{
  update: [value: string];
  createOption: [option: SelectOption];
}>();

const menuVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const { effectiveTheme } = useTheme();

const getColorNameFromHex = (hex: string): string => {
  const normalizedHex = hex.toLowerCase().trim();
  const color = TAG_COLOR_PALETTE.find(
    c => c.light.toLowerCase() === normalizedHex || c.dark.toLowerCase() === normalizedHex
  );
  return color ? color.name : 'gray';
};

const getOptionStyle = (colorNameOrHex: string) => {
  let colorName = colorNameOrHex;

  if (colorNameOrHex.startsWith('#')) {
    colorName = getColorNameFromHex(colorNameOrHex);
  }

  const palette = TAG_COLOR_PALETTE.find(c => c.name === colorName) || TAG_COLOR_PALETTE[0];
  const isDark = effectiveTheme.value === 'dark';

  return {
    backgroundColor: isDark ? palette.dark : palette.light,
    color: isDark ? '#ffffff' : palette.text
  };
};

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

  // Get next color name from palette (cycle through colors)
  const nextColorIndex = (props.column.options?.length || 0) % TAG_COLOR_PALETTE.length;
  const newOption: SelectOption = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    label: searchQuery.value.trim(),
    color: TAG_COLOR_PALETTE[nextColorIndex].name,
  };

  // Emit event to parent component to handle the option creation
  emit('createOption', newOption);

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
}

.create-icon {
  font-size: 18px;
  font-weight: 600;
}

/* Dark theme */
.dark .cell-value.empty {
  color: #6b7280;
}

.dark .select-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.dark .menu-search {
  border-bottom-color: #374151;
  background: #1f2937;
  color: #d1d5db;
}

.dark .menu-option:hover {
  background: #374151;
}

.dark .menu-option.active {
  background: #1e3a5f;
}

.dark .menu-option.create {
  color: #60a5fa;
}

/* Теги с цветным фоном сохраняют темный текст для читаемости на светлых фонах */
</style>
