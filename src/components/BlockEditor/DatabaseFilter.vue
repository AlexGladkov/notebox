<template>
  <div class="database-filter">
    <button
      class="filter-button"
      :class="{ active: modelValue }"
      @click="toggleMenu"
    >
      <svg class="filter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>Фильтр</span>
      <span v-if="modelValue" class="active-indicator"></span>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="filter-menu"
      @click.stop
    >
      <div class="menu-header">Фильтр</div>

      <div class="menu-section">
        <label class="menu-label">Колонка</label>
        <select
          v-model="selectedColumnId"
          class="menu-select"
          @change="handleColumnChange"
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
        <label class="menu-label">Условие</label>
        <select
          v-model="selectedOperator"
          class="menu-select"
        >
          <option
            v-for="op in availableOperators"
            :key="op.value"
            :value="op.value"
          >
            {{ op.label }}
          </option>
        </select>
      </div>

      <div v-if="selectedColumnId && needsValue" class="menu-section">
        <label class="menu-label">Значение</label>
        <input
          v-if="selectedColumnType === 'TEXT' || selectedColumnType === 'EMAIL' || selectedColumnType === 'URL' || selectedColumnType === 'PHONE'"
          v-model="selectedValue"
          type="text"
          class="menu-input"
          placeholder="Введите значение"
        />
        <input
          v-else-if="selectedColumnType === 'NUMBER'"
          v-model.number="selectedValue"
          type="number"
          class="menu-input"
          placeholder="Введите число"
        />
        <input
          v-else-if="selectedColumnType === 'DATE'"
          v-model="selectedValue"
          type="date"
          class="menu-input"
        />
        <input
          v-else
          v-model="selectedValue"
          type="text"
          class="menu-input"
          placeholder="Введите значение"
        />
      </div>

      <div class="menu-actions">
        <button class="menu-button secondary" @click="handleClear">
          Очистить
        </button>
        <button
          class="menu-button primary"
          :disabled="!canApply"
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
import { ref, computed, watch } from 'vue';
import type { Column, ColumnType } from '../../types';
import type { DatabaseFilter } from '../../types/database';

const props = defineProps<{
  modelValue: DatabaseFilter | null;
  columns: Column[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DatabaseFilter | null];
}>();

const menuVisible = ref(false);
const selectedColumnId = ref<string | null>(props.modelValue?.columnId || null);
const selectedOperator = ref<DatabaseFilter['operator']>(props.modelValue?.operator || 'equals');
const selectedValue = ref<any>(props.modelValue?.value || '');

const selectedColumn = computed(() => {
  if (!selectedColumnId.value) return null;
  return props.columns.find(col => col.id === selectedColumnId.value);
});

const selectedColumnType = computed(() => selectedColumn.value?.type || null);

const availableOperators = computed(() => {
  const type = selectedColumnType.value;

  if (!type) return [];

  const operators: Array<{ value: DatabaseFilter['operator']; label: string }> = [
    { value: 'isEmpty', label: 'Пусто' },
    { value: 'isNotEmpty', label: 'Не пусто' },
  ];

  if (type === 'TEXT' || type === 'EMAIL' || type === 'URL' || type === 'PHONE') {
    operators.unshift(
      { value: 'equals', label: 'Равно' },
      { value: 'contains', label: 'Содержит' }
    );
  } else if (type === 'NUMBER') {
    operators.unshift(
      { value: 'equals', label: 'Равно' },
      { value: 'gt', label: 'Больше' },
      { value: 'lt', label: 'Меньше' },
      { value: 'gte', label: 'Больше или равно' },
      { value: 'lte', label: 'Меньше или равно' }
    );
  } else {
    operators.unshift({ value: 'equals', label: 'Равно' });
  }

  return operators;
});

const needsValue = computed(() => {
  return selectedOperator.value !== 'isEmpty' && selectedOperator.value !== 'isNotEmpty';
});

const canApply = computed(() => {
  if (!selectedColumnId.value) return false;
  if (needsValue.value && (selectedValue.value === '' || selectedValue.value === null)) return false;
  return true;
});

watch(() => props.modelValue, (newValue) => {
  selectedColumnId.value = newValue?.columnId || null;
  selectedOperator.value = newValue?.operator || 'equals';
  selectedValue.value = newValue?.value || '';
});

const handleColumnChange = () => {
  // Reset operator and value when column changes
  selectedOperator.value = 'equals';
  selectedValue.value = '';
};

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const closeMenu = () => {
  menuVisible.value = false;
};

const handleApply = () => {
  if (canApply.value && selectedColumnId.value) {
    const filter: DatabaseFilter = {
      columnId: selectedColumnId.value,
      operator: selectedOperator.value,
    };

    if (needsValue.value) {
      filter.value = selectedValue.value;
    }

    emit('update:modelValue', filter);
  }
  closeMenu();
};

const handleClear = () => {
  selectedColumnId.value = null;
  selectedOperator.value = 'equals';
  selectedValue.value = '';
  emit('update:modelValue', null);
  closeMenu();
};
</script>

<style scoped>
.database-filter {
  position: relative;
}

.filter-button {
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

.dark .filter-button {
  background: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

.filter-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.dark .filter-button:hover {
  background: #111827;
  border-color: #4b5563;
  color: #e5e7eb;
}

.filter-button.active {
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-icon {
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

.filter-menu {
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

.dark .filter-menu {
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

.menu-select,
.menu-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #111827;
  font-size: 14px;
  outline: none;
}

.dark .menu-select,
.dark .menu-input {
  background: #111827;
  border-color: #374151;
  color: #f9fafb;
}

.menu-select {
  cursor: pointer;
}

.menu-select:focus,
.menu-input:focus {
  border-color: #3b82f6;
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
