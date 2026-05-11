<template>
  <div
    class="kanban-card"
    :class="{ dragging: isDragging }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('click')"
  >
    <div class="card-header">
      <span class="card-title">{{ cardTitle }}</span>
      <button class="card-menu-btn" @click.stop="toggleMenu" title="Меню">
        <span>⋮</span>
      </button>
    </div>

    <div v-if="cardFields && cardFields.length > 0" class="card-fields">
      <div v-for="field in displayFields" :key="field.columnId" class="card-field">
        <span class="field-label">{{ field.columnName }}:</span>
        <span class="field-value" :class="`field-type-${field.type}`">
          {{ field.displayValue }}
        </span>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showMenu"
      class="card-menu"
      @click.stop
    >
      <div class="card-menu-item" @click="handleDelete">
        <span class="menu-icon">🗑️</span>
        <span>Удалить</span>
      </div>
    </div>
  </div>

  <!-- Overlay for closing menu -->
  <div
    v-if="showMenu"
    class="card-menu-overlay"
    @click.stop="showMenu = false"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Record, CustomDatabase } from '../../types';

interface Props {
  record: Record;
  database: CustomDatabase;
  cardFields?: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [];
  delete: [];
  dragStart: [event: DragEvent];
  dragEnd: [event: DragEvent];
}>();

const showMenu = ref(false);
const isDragging = ref(false);

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const handleDelete = () => {
  if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
    emit('delete');
  }
  showMenu.value = false;
};

const handleDragStart = (event: DragEvent) => {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
      recordId: props.record.id,
    }));
  }
  emit('dragStart', event);
};

const handleDragEnd = (event: DragEvent) => {
  isDragging.value = false;
  emit('dragEnd', event);
};

// Получить заголовок карточки (первая TEXT колонка)
const cardTitle = computed(() => {
  const textColumn = props.database.columns.find(col => col.type === 'TEXT');
  if (!textColumn) return 'Без названия';

  const value = props.record.data[textColumn.id];
  return value || 'Без названия';
});

// Получить поля для отображения на карточке
const displayFields = computed(() => {
  if (!props.cardFields || props.cardFields.length === 0) return [];

  return props.cardFields
    .map(columnId => {
      const column = props.database.columns.find(col => col.id === columnId);
      if (!column) return null;

      const value = props.record.data[columnId];
      let displayValue = '';

      switch (column.type) {
        case 'SELECT':
          if (value && column.options) {
            const option = column.options.find(opt => opt.id === value);
            displayValue = option?.label || '';
          }
          break;
        case 'MULTI_SELECT':
          if (Array.isArray(value) && column.options) {
            const labels = value
              .map(optId => {
                const option = column.options!.find(opt => opt.id === optId);
                return option?.label;
              })
              .filter(Boolean);
            displayValue = labels.join(', ');
          }
          break;
        case 'DATE':
          if (value) {
            displayValue = new Date(value).toLocaleDateString('ru-RU');
          }
          break;
        case 'BOOLEAN':
          displayValue = value ? '✓' : '✗';
          break;
        case 'NUMBER':
          displayValue = value !== null && value !== undefined ? String(value) : '';
          break;
        default:
          displayValue = value || '';
      }

      return {
        columnId,
        columnName: column.name,
        type: column.type,
        displayValue,
      };
    })
    .filter((field): field is { columnId: string; columnName: string; type: string; displayValue: string } =>
      field !== null && field.displayValue !== null && field.displayValue !== undefined && field.displayValue !== ''
    );
});
</script>

<style scoped>
.kanban-card {
  position: relative;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 8px;
}

.dark .kanban-card {
  background: #1f2937;
  border-color: #374151;
}

.kanban-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.dark .kanban-card:hover {
  border-color: #4b5563;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.kanban-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  line-height: 1.4;
  word-wrap: break-word;
}

.dark .card-title {
  color: #f9fafb;
}

.card-menu-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: all 0.15s ease;
}

.kanban-card:hover .card-menu-btn {
  opacity: 1;
}

.card-menu-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .card-menu-btn:hover {
  background: #374151;
  color: #e5e7eb;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-field {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.field-label {
  color: #6b7280;
  font-weight: 500;
  flex-shrink: 0;
}

.dark .field-label {
  color: #9ca3af;
}

.field-value {
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .field-value {
  color: #d1d5db;
}

.field-type-BOOLEAN {
  font-size: 14px;
}

/* Card Menu */
.card-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1001;
}

.card-menu {
  position: absolute;
  top: 32px;
  right: 8px;
  z-index: 1002;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 140px;
}

.dark .card-menu {
  background: #1f2937;
  border-color: #374151;
}

.card-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  color: #dc2626;
  font-size: 14px;
}

.dark .card-menu-item {
  color: #f87171;
}

.card-menu-item:hover {
  background: #fef2f2;
}

.dark .card-menu-item:hover {
  background: #374151;
}

.menu-icon {
  font-size: 14px;
}
</style>
