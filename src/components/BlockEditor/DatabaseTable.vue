<template>
  <div class="database-table-wrapper">
    <table class="database-table">
      <thead>
        <tr>
          <th class="checkbox-cell">
            <input type="checkbox" class="row-checkbox" disabled />
          </th>
          <th
            v-for="column in database.columns"
            :key="column.id"
            class="column-header-cell"
          >
            <DatabaseColumnHeader
              :column="column"
              @update="handleUpdateColumn"
              @delete="handleDeleteColumn"
              @sort="handleSort"
            />
          </th>
          <th class="add-column-cell">
            <DatabaseAddColumn @add="handleAddColumn" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in records"
          :key="record.id"
          class="data-row"
          @contextmenu.prevent="handleRowContextMenu($event, record.id)"
        >
          <td class="checkbox-cell">
            <input type="checkbox" class="row-checkbox" disabled />
          </td>
          <td
            v-for="(column, index) in database.columns"
            :key="column.id"
            class="data-cell"
          >
            <div class="cell-content">
              <svg
                v-if="index === 0"
                class="record-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <DatabaseCell
                :column="column"
                :value="record.data[column.id]"
                :record-id="record.id"
                @update="handleCellUpdate(record.id, column.id, $event)"
                @create-option="handleCreateOption(column, $event)"
              />
            </div>
          </td>
          <td class="empty-cell"></td>
        </tr>
        <tr v-if="records.length === 0" class="empty-row">
          <td :colspan="database.columns.length + 2" class="empty-message">
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>

    <DatabaseAddRow @add="handleAddRow" />

    <!-- Context Menu for Row -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        top: contextMenu.y + 'px',
        left: contextMenu.x + 'px',
      }"
      @click="closeContextMenu"
    >
      <div class="context-menu-item" @click="deleteRow">
        <span class="context-menu-icon">🗑️</span>
        <span>Удалить строку</span>
      </div>
    </div>

    <!-- Overlay to close context menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu-overlay"
      @click="closeContextMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import DatabaseColumnHeader from './DatabaseColumnHeader.vue';
import DatabaseAddColumn from './DatabaseAddColumn.vue';
import DatabaseAddRow from './DatabaseAddRow.vue';
import DatabaseCell from './DatabaseCell.vue';
import type { CustomDatabase, Record, Column, ColumnType, SelectOption } from '../../types';
import type { DatabaseFilter, DatabaseSort } from '../../types/database';

const props = defineProps<{
  database: CustomDatabase;
  records: Record[];
  filter?: DatabaseFilter | null;
  sort?: DatabaseSort | null;
  searchQuery?: string;
}>();

const emptyMessage = computed(() => {
  if (props.filter || props.searchQuery) {
    return 'Нет записей, соответствующих фильтру';
  }
  return 'Нет записей';
});

const emit = defineEmits<{
  updateRecord: [recordId: string, data: { [columnId: string]: any }];
  createRecord: [data: { [columnId: string]: any }];
  deleteRecord: [recordId: string];
  addColumn: [name: string, type: ColumnType, options?: SelectOption[]];
  updateColumn: [columnId: string, name: string, type: ColumnType, options?: SelectOption[]];
  deleteColumn: [columnId: string];
  sort: [columnId: string, direction: 'asc' | 'desc'];
}>();

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  recordId: null as string | null,
});

const handleCellUpdate = (recordId: string, columnId: string, value: any) => {
  const record = props.records.find(r => r.id === recordId);
  if (!record) return;

  const updatedData = { ...record.data, [columnId]: value };
  emit('updateRecord', recordId, updatedData);
};

const handleCreateOption = (column: Column, newOption: SelectOption) => {
  // Add the new option to the column's options array
  const updatedOptions = [...(column.options || []), newOption];
  emit('updateColumn', column.id, column.name, column.type, updatedOptions);
};

const handleAddRow = () => {
  // Create empty record with default values for each column
  const newData: { [columnId: string]: any } = {};

  props.database.columns.forEach(column => {
    switch (column.type) {
      case 'BOOLEAN':
        newData[column.id] = false;
        break;
      case 'NUMBER':
        newData[column.id] = null;
        break;
      case 'CREATED_TIME':
        newData[column.id] = Date.now();
        break;
      case 'LAST_EDITED_TIME':
        newData[column.id] = Date.now();
        break;
      default:
        newData[column.id] = '';
    }
  });

  emit('createRecord', newData);
};

const handleAddColumn = (name: string, type: ColumnType, options?: SelectOption[]) => {
  emit('addColumn', name, type, options);
};

const handleUpdateColumn = (
  columnId: string,
  name: string,
  type: ColumnType,
  options?: SelectOption[]
) => {
  emit('updateColumn', columnId, name, type, options);
};

const handleDeleteColumn = (columnId: string) => {
  if (confirm('Вы уверены, что хотите удалить эту колонку? Все данные в ней будут потеряны.')) {
    emit('deleteColumn', columnId);
  }
};

const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
  emit('sort', columnId, direction);
};

const handleRowContextMenu = (event: MouseEvent, recordId: string) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    recordId,
  };
  document.addEventListener('keydown', handleContextMenuEscape);
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.recordId = null;
  document.removeEventListener('keydown', handleContextMenuEscape);
};

const handleContextMenuEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeContextMenu();
  }
};

const deleteRow = () => {
  if (contextMenu.value.recordId) {
    emit('deleteRecord', contextMenu.value.recordId);
  }
  closeContextMenu();
};

onUnmounted(() => {
  // Очистка обработчика на случай, если компонент размонтируется с открытым меню
  document.removeEventListener('keydown', handleContextMenuEscape);
});
</script>

<style scoped>
.database-table-wrapper {
  width: 100%;
  position: relative;
}

.database-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: visible;
  font-size: 14px;
  table-layout: fixed;
}

.database-table thead {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.checkbox-cell {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 8px;
  text-align: center;
  border-right: 1px solid #e5e7eb;
}

.row-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.row-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.column-header-cell,
.add-column-cell {
  padding: 8px 12px;
  text-align: left;
  font-weight: 500;
  color: #374151;
  border-right: 1px solid #e5e7eb;
  min-width: 150px;
  max-width: 300px;
}

.column-header-cell:last-of-type {
  border-right: none;
}

.add-column-cell {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  border-right: none;
}

.data-row {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.15s ease;
}

.data-row:hover {
  background: #f9fafb;
}

.data-row:last-child {
  border-bottom: none;
}

.data-cell,
.empty-cell {
  padding: 8px 12px;
  border-right: 1px solid #e5e7eb;
  min-width: 150px;
  max-width: 300px;
  vertical-align: middle;
}

.cell-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.record-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}

.dark .record-icon {
  color: #6b7280;
}

.data-cell:last-of-type {
  border-right: none;
}

.empty-cell {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  border-right: none;
}

.empty-row {
  border-bottom: none;
}

.empty-message {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
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
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 180px;
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

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-icon {
  font-size: 16px;
}
</style>
