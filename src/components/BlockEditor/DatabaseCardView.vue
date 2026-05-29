<template>
  <div class="database-card-view">
    <!-- Cards grid -->
    <div v-if="records.length > 0" class="cards-grid">
      <div
        v-for="record in records"
        :key="record.id"
        class="record-card"
        @contextmenu.prevent="handleCardContextMenu($event, record.id)"
      >
        <!-- Card header with icon and title -->
        <div class="card-header">
          <svg class="record-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div class="card-title">
            {{ getRecordTitle(record) }}
          </div>
        </div>

        <!-- Card fields -->
        <div class="card-fields">
          <div
            v-for="column in database.columns.slice(1)"
            :key="column.id"
            class="card-field"
          >
            <div class="field-label">
              {{ column.name }}
            </div>
            <div class="field-value">
              <DatabaseCell
                :column="column"
                :value="record.data[column.id]"
                :record-id="record.id"
                @update="handleCellUpdate(record.id, column.id, $event)"
                @create-option="handleCreateOption(column, $event)"
                @update-option-color="(optionId, color) => handleUpdateOptionColor(column, optionId, color)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="records.length === 0" class="database-empty-state">
      <EmptyState
        v-if="filter || searchQuery"
        title="Нет записей, соответствующих фильтру"
        description="Измените условия фильтрации или сбросьте фильтры"
        :icon="EmptyDatabaseIllustration"
        cta-label="Сбросить фильтры"
        cta-variant="secondary"
        @cta-click="$emit('reset-filters')"
      />
      <EmptyState
        v-else
        title="Добавьте первую запись"
        description="База данных готова. Начните добавлять записи."
        :icon="EmptyDatabaseIllustration"
        cta-label="Добавить запись"
        cta-variant="primary"
        @cta-click="handleAddRow"
      />
    </div>

    <!-- Add row button -->
    <DatabaseAddRow v-if="records.length > 0" @add="handleAddRow" />

    <!-- Context Menu for Card -->
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
        <span>Удалить запись</span>
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
import { ref, onMounted, onUnmounted } from 'vue';
import DatabaseCell from './DatabaseCell.vue';
import DatabaseAddRow from './DatabaseAddRow.vue';
import EmptyState from '../EmptyState.vue';
import EmptyDatabaseIllustration from '../illustrations/EmptyDatabaseIllustration.vue';
import type { CustomDatabase, Record, Column, ColumnType, SelectOption } from '../../types';
import type { DatabaseFilter } from '../../types/database';

const props = defineProps<{
  database: CustomDatabase;
  records: Record[];
  filter?: DatabaseFilter | null;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  updateRecord: [recordId: string, data: { [columnId: string]: any }];
  createRecord: [data: { [columnId: string]: any }];
  deleteRecord: [recordId: string];
  'reset-filters': [];
}>();

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  recordId: null as string | null,
});

const getRecordTitle = (record: Record): string => {
  const firstColumn = props.database.columns[0];
  if (!firstColumn) return 'Без названия';

  const value = record.data[firstColumn.id];
  if (!value) return 'Без названия';

  if (typeof value === 'string') return value;
  return String(value);
};

const handleCellUpdate = (recordId: string, columnId: string, value: any) => {
  emit('updateRecord', recordId, { [columnId]: value });
};

const handleAddRow = () => {
  const defaultData: { [columnId: string]: any } = {};
  props.database.columns.forEach((column) => {
    defaultData[column.id] = null;
  });
  emit('createRecord', defaultData);
};

const handleCardContextMenu = (event: MouseEvent, recordId: string) => {
  contextMenu.value.visible = true;
  contextMenu.value.x = event.clientX;
  contextMenu.value.y = event.clientY;
  contextMenu.value.recordId = recordId;
};

const deleteRow = () => {
  if (contextMenu.value.recordId) {
    emit('deleteRecord', contextMenu.value.recordId);
  }
  closeContextMenu();
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.recordId = null;
};

const handleCreateOption = (column: Column, optionName: string) => {
  // Передаем событие наверх для обработки в DatabaseTable
  // TODO: implement option creation
};

const handleUpdateOptionColor = (column: Column, optionId: string, color: string) => {
  // Передаем событие наверх для обработки в DatabaseTable
  // TODO: implement option color update
};

// Close context menu on Escape
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && contextMenu.value.visible) {
    closeContextMenu();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.database-card-view {
  padding: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.record-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.15s ease;
}

.record-card:active {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .record-card {
  background: #1f2937;
  border-color: #374151;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .card-header {
  border-bottom-color: #374151;
}

.record-icon {
  width: 24px;
  height: 24px;
  color: #6b7280;
  flex-shrink: 0;
}

.dark .record-icon {
  color: #9ca3af;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .card-title {
  color: #f9fafb;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dark .field-label {
  color: #9ca3af;
}

.field-value {
  font-size: 14px;
  color: #111827;
}

.dark .field-value {
  color: #f9fafb;
}

.database-empty-state {
  padding: 40px 20px;
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 180px;
}

.dark .context-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  min-height: 44px;
}

.dark .context-menu-item {
  color: #f9fafb;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.dark .context-menu-item:hover {
  background-color: #374151;
}

.context-menu-icon {
  font-size: 18px;
}

.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}
</style>
