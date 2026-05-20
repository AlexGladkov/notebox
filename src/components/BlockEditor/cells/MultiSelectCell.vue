<template>
  <div class="multi-select-cell" @click="toggleMenu">
    <div v-if="selectedOptions.length > 0" class="select-tags">
      <span
        v-for="option in selectedOptions"
        :key="option.id"
        class="select-tag"
        :style="getOptionStyle(option.color || 'gray')"
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
      ref="menuElement"
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
          <span class="option-tag" :style="getOptionStyle(option.color)">
            {{ option.label }}
          </span>
          <button
            :ref="(el) => setSettingsButtonRef(option.id, el)"
            class="option-settings-btn"
            @click.stop="toggleColorPicker(option.id)"
            title="Изменить цвет"
          >
            ⋮
          </button>

          <!-- Color Picker Submenu -->
          <Teleport to="body">
            <div
              v-if="colorPickerVisible === option.id"
              :ref="(el) => setColorPickerRef(option.id, el)"
              class="color-picker-popup"
              :style="colorPickerStyle"
              @click.stop
            >
              <ColorPicker
                :selected-color="option.color"
                @select="(color) => updateOptionColor(option.id, color)"
              />
            </div>
          </Teleport>
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
import { ref, computed, nextTick, onUnmounted } from 'vue';
import type { Column, SelectOption } from '../../../types';
import { TAG_COLOR_PALETTE } from '../../../types/database';
import { useTheme } from '../../../composables/useTheme';
import ColorPicker from './ColorPicker.vue';

const props = defineProps<{
  value: string[] | null;
  column: Column;
}>();

const emit = defineEmits<{
  update: [value: string[]];
  createOption: [option: SelectOption];
  updateOptionColor: [optionId: string, color: string];
}>();

const menuVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const menuElement = ref<HTMLElement | null>(null);
const colorPickerVisible = ref<string | null>(null);
const settingsButtonRefs = ref<Map<string, HTMLElement>>(new Map());
let clickOutsideTimer: ReturnType<typeof setTimeout> | null = null;

const { effectiveTheme } = useTheme();

const getColorNameFromHex = (hex: string): string => {
  const normalizedHex = hex.toLowerCase().trim();
  const color = TAG_COLOR_PALETTE.find(
    c => c.light.toLowerCase() === normalizedHex || c.dark.toLowerCase() === normalizedHex
  );
  return color ? color.name : 'gray';
};

const getOptionStyle = (colorNameOrHex: string | undefined) => {
  if (!colorNameOrHex) {
    colorNameOrHex = 'gray';
  }

  let colorName = colorNameOrHex;

  if (colorNameOrHex.startsWith('#')) {
    colorName = getColorNameFromHex(colorNameOrHex);
  }

  const palette = TAG_COLOR_PALETTE.find(c => c.name === colorName) || TAG_COLOR_PALETTE.find(c => c.name === 'gray')!;
  const isDark = effectiveTheme.value === 'dark';

  return {
    backgroundColor: isDark ? palette.dark : palette.light,
    color: isDark ? '#ffffff' : palette.text
  };
};

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

const colorPickerPopupRefs = ref<Map<string, HTMLElement>>(new Map());

const colorPickerStyle = computed(() => {
  if (!colorPickerVisible.value) return {};

  const button = settingsButtonRefs.value.get(colorPickerVisible.value);
  if (!button) return {};

  const rect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Реальная ширина ColorPicker: 4 * 32px (swatches) + 3 * 6px (gaps) + 2 * 8px (padding) + 2px (border)
  const pickerWidth = 164;
  // Реальная высота ColorPicker: header (~28px) + 2 ряда * 32px + gap 6px + 2 * 8px (padding) + 2px (border)
  const pickerHeight = 106;

  // Горизонтальное позиционирование: справа от кнопки, но не выходим за viewport
  let left = rect.right + 8;
  if (left + pickerWidth > viewportWidth) {
    // Если не хватает места справа, показываем слева от кнопки
    left = rect.left - pickerWidth - 8;
    // Если и слева не хватает, прижимаем к правому краю viewport
    if (left < 0) {
      left = viewportWidth - pickerWidth - 8;
    }
  }

  // Вертикальное позиционирование: выравниваем по верху кнопки, но не выходим за viewport
  let top = rect.top;
  if (top + pickerHeight > viewportHeight) {
    // Если не хватает места снизу, показываем выше
    top = rect.bottom - pickerHeight;
    // Если и сверху не хватает, прижимаем к нижнему краю viewport
    if (top < 0) {
      top = viewportHeight - pickerHeight - 8;
    }
  }

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 10000
  };
});

const setSettingsButtonRef = (optionId: string, el: Element | null) => {
  if (el) {
    settingsButtonRefs.value.set(optionId, el as HTMLElement);
  } else {
    settingsButtonRefs.value.delete(optionId);
  }
};

const setColorPickerRef = (optionId: string, el: Element | null) => {
  if (el) {
    colorPickerPopupRefs.value.set(optionId, el as HTMLElement);
  } else {
    colorPickerPopupRefs.value.delete(optionId);
  }
};

const isSelected = (optionId: string) => {
  return selectedValues.value.includes(optionId);
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
};

const handleScroll = () => {
  // Закрываем ColorPicker при скролле, чтобы избежать рассинхронизации позиции
  if (colorPickerVisible.value !== null) {
    colorPickerVisible.value = null;
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;

  // Проверяем, что клик не внутри меню и не внутри ColorPicker
  const isInsideMenu = menuElement.value && menuElement.value.contains(target);
  const isInsideColorPicker = Array.from(colorPickerPopupRefs.value.values()).some(
    (el) => el && el.contains(target)
  );

  if (!isInsideMenu && !isInsideColorPicker) {
    closeMenu();
  }
};

const toggleMenu = async () => {
  if (!menuVisible.value) {
    menuVisible.value = true;
    searchQuery.value = '';
    await nextTick();
    searchInput.value?.focus();
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true); // capture phase для всех скроллов
    clickOutsideTimer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  } else {
    closeMenu();
  }
};

const closeMenu = () => {
  menuVisible.value = false;
  searchQuery.value = '';
  colorPickerVisible.value = null;
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('scroll', handleScroll, true);
  if (clickOutsideTimer) {
    clearTimeout(clickOutsideTimer);
    clickOutsideTimer = null;
  }
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

  // Get next color name from palette (cycle through colors)
  const nextColorIndex = (props.column.options?.length || 0) % TAG_COLOR_PALETTE.length;
  const newOption: SelectOption = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    label: searchQuery.value.trim(),
    color: TAG_COLOR_PALETTE[nextColorIndex].name,
  };

  // Emit event to parent component to handle the option creation
  emit('createOption', newOption);

  // Add to selection
  const currentValues = [...selectedValues.value, newOption.id];
  emit('update', currentValues);

  searchQuery.value = '';
};

const toggleColorPicker = (optionId: string) => {
  if (colorPickerVisible.value === optionId) {
    colorPickerVisible.value = null;
  } else {
    colorPickerVisible.value = optionId;
  }
};

const updateOptionColor = (optionId: string, color: string) => {
  emit('updateOptionColor', optionId, color);
  colorPickerVisible.value = null;
};

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('scroll', handleScroll, true);
  if (clickOutsideTimer) {
    clearTimeout(clickOutsideTimer);
  }
});
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
  position: relative;
}

.menu-option:hover {
  background: #f3f4f6;
}

.menu-option.active {
  background: #eff6ff;
}

.option-settings-btn {
  margin-left: auto;
  padding: 2px 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 16px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s ease;
}

.menu-option:hover .option-settings-btn {
  opacity: 1;
}

.option-settings-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.dark .option-settings-btn:hover {
  background: #4b5563;
  color: #e5e7eb;
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
}

.create-icon {
  font-size: 18px;
  font-weight: 600;
}

.color-picker-popup {
  position: fixed;
  z-index: 10000;
}
</style>
