<template>
  <div class="database-table-wrapper">
    <table class="database-table">
      <thead>
        <tr>
          <th
            v-for="column in database.columns"
            :key="column.id"
            class="column-header-cell"
          >
            <DatabaseColumnHeader
              :column="column"
              @update="handleUpdateColumn"
              @delete="handleDeleteColumn"
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
          <td
            v-for="column in database.columns"
            :key="column.id"
            class="data-cell"
          >
            <DatabaseCell
              :column="column"
              :value="record.data[column.id]"
              :record-id="record.id"
              @update="handleCellUpdate(record.id, column.id, $event)"
            />
          </td>
          <td class="empty-cell"></td>
        </tr>
        <tr v-if="records.length === 0" class="empty-row">
          <td :colspan="database.columns.length + 1" class="empty-message">
            Нет записей
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
import { ref, onUnmounted } from 'vue';
import DatabaseColumnHeader from './DatabaseColumnHeader.vue';
import DatabaseAddColumn from './DatabaseAddColumn.vue';
import DatabaseAddRow from './DatabaseAddRow.vue';
import DatabaseCell from './DatabaseCell.vue';
import type { CustomDatabase, Record, Column, ColumnType, SelectOption } from '../../types';

const props = defineProps<{
  database: CustomDatabase;
  records: Record[];
}>();

const emit = defineEmits<{
  updateRecord: [recordId: string, data: { [columnId: string]: any }];
  createRecord: [data: { [columnId: string]: any }];
  deleteRecord: [recordId: string];
  addColumn: [name: string, type: ColumnType, options?: SelectOption[]];
  updateColumn: [columnId: string, name: string, type: ColumnType, options?: SelectOption[]];
  deleteColumn: [columnId: string];
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
