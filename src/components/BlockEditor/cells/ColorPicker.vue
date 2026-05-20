<template>
  <div class="color-picker" @click.stop>
    <div class="color-picker-header">Выбрать цвет</div>
    <div class="color-swatches">
      <div
        v-for="color in TAG_COLOR_PALETTE"
        :key="color.name"
        class="color-swatch"
        :class="{ selected: selectedColor === color.name }"
        :style="{ backgroundColor: isDark ? color.dark : color.light }"
        :title="color.name"
        @click="handleSelect(color.name)"
      >
        <span v-if="selectedColor === color.name" class="check-icon">✓</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TAG_COLOR_PALETTE } from '../../../types/database';
import { useTheme } from '../../../composables/useTheme';

defineProps<{
  selectedColor?: string;
}>();

const emit = defineEmits<{
  select: [color: string];
}>();

const { effectiveTheme } = useTheme();

const isDark = computed(() => effectiveTheme.value === 'dark');

const handleSelect = (color: string) => {
  emit('select', color);
};
</script>

<style scoped>
.color-picker {
  padding: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

.dark .color-picker {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.color-picker-header {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
  padding: 0 4px;
}

.dark .color-picker-header {
  color: #9ca3af;
}

.color-swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  border: 2px solid transparent;
}

.color-swatch:hover {
  transform: scale(1.1);
  border-color: rgba(59, 130, 246, 0.5);
}

.color-swatch.selected {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.check-icon {
  color: white;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
