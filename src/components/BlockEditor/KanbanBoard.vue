<template>
  <div class="kanban-board">
    <div v-if="!hasSelectColumns" class="kanban-empty-state">
      <div class="empty-state-icon">📋</div>
      <h3 class="empty-state-title">Требуется SELECT-колонка</h3>
      <p class="empty-state-text">
        Для использования Kanban-представления необходима колонка типа SELECT или MULTI_SELECT.
        Создайте её в настройках базы данных.
      </p>
    </div>

    <div v-else-if="!groupByColumn" class="kanban-empty-state">
      <div class="empty-state-icon">⚙️</div>
      <h3 class="empty-state-title">Не выбрана колонка группировки</h3>
      <p class="empty-state-text">
        Выберите SELECT-колонку для группировки карточек.
      </p>
      <button class="empty-state-btn" @click="showGroupBySelector = true">
        Выбрать колонку
      </button>
    </div>

    <div v-else class="kanban-content">
      <div class="kanban-columns">
        <KanbanColumn
          v-for="column in columns"
          :key="column.id"
          :option="column.option"
          :records="column.records"
          :database="database"
          :collapsed="isColumnCollapsed(column.id)"
          :collapsible="true"
          :card-fields="view.kanban?.cardFields || []"
          @drop="handleDrop"
          @toggle-collapse="toggleColumnCollapse(column.id)"
          @add-card="handleAddCard"
          @card-click="handleCardClick"
          @card-delete="handleCardDelete"
        />
      </div>
    </div>

    <!-- Group By Selector Modal -->
    <div v-if="showGroupBySelector" class="modal-overlay" @click="showGroupBySelector = false">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">Выберите колонку для группировки</h3>
        <div class="modal-body">
          <div
            v-for="col in selectColumns"
            :key="col.id"
            class="modal-option"
            @click="selectGroupByColumn(col.id)"
          >
            <span class="option-name">{{ col.name }}</span>
            <span class="option-type">{{ col.type }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-cancel" @click="showGroupBySelector = false">
            Отмена
          </button>
        </div>
      </div>
    </div>

    <!-- Card Edit Modal -->
    <KanbanCardModal
      v-if="editingRecordId"
      :record="editingRecord!"
      :database="database"
      @close="editingRecordId = null"
      @update="handleUpdateRecord"
      @delete="handleDeleteRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import KanbanCardModal from './KanbanCardModal.vue';
import type { CustomDatabase, Record, SelectOption } from '../../types';
import type { DatabaseView } from '../../types/database';

interface Props {
  database: CustomDatabase;
  records: Record[];
  view: DatabaseView;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update-record': [recordId: string, data: { [columnId: string]: any }];
  'create-record': [data: { [columnId: string]: any }];
  'delete-record': [recordId: string];
  'update-view': [updates: Partial<DatabaseView>];
}>();

const showGroupBySelector = ref(false);
const editingRecordId = ref<string | null>(null);

// Получить SELECT/MULTI_SELECT колонки
const selectColumns = computed(() => {
  return props.database.columns.filter(
    col => col.type === 'SELECT' || col.type === 'MULTI_SELECT'
  );
});

const hasSelectColumns = computed(() => {
  return selectColumns.value.length > 0;
});

// Получить колонку группировки
const groupByColumn = computed(() => {
  if (!props.view.kanban?.groupByColumnId) return null;
  return props.database.columns.find(
    col => col.id === props.view.kanban!.groupByColumnId
  );
});

// Получить колонки для отображения
const columns = computed(() => {
  if (!groupByColumn.value) return [];

  const options = groupByColumn.value.options || [];
  const columnOrder = props.view.kanban?.columnOrder || options.map(o => o.id);

  // Создаём колонки на основе опций
  const optionColumns = columnOrder
    .map(optionId => {
      const option = options.find(o => o.id === optionId);
      if (!option) return null;

      const columnRecords = props.records.filter(record => {
        const value = record.data[groupByColumn.value!.id];
        return value === option.id;
      });

      return {
        id: option.id,
        option,
        records: columnRecords,
      };
    })
    .filter((col): col is { id: string; option: SelectOption; records: Record[] } => col !== null);

  // Добавляем колонку "Без статуса" для записей без значения
  const unassignedRecords = props.records.filter(record => {
    const value = record.data[groupByColumn.value!.id];
    return !value || value === '';
  });

  if (unassignedRecords.length > 0 || optionColumns.length === 0) {
    optionColumns.push({
      id: 'unassigned',
      option: null,
      records: unassignedRecords,
    } as any);
  }

  return optionColumns;
});

// Проверка, свёрнута ли колонка
const isColumnCollapsed = (columnId: string): boolean => {
  return props.view.kanban?.collapsedColumns?.includes(columnId) || false;
};

// Переключить сворачивание колонки
const toggleColumnCollapse = (columnId: string) => {
  const collapsed = props.view.kanban?.collapsedColumns || [];
  const newCollapsed = collapsed.includes(columnId)
    ? collapsed.filter(id => id !== columnId)
    : [...collapsed, columnId];

  emit('update-view', {
    kanban: {
      ...props.view.kanban!,
      collapsedColumns: newCollapsed,
    },
  });
};

// Выбрать колонку группировки
const selectGroupByColumn = (columnId: string) => {
  emit('update-view', {
    kanban: {
      groupByColumnId: columnId,
      cardFields: [],
      columnOrder: [],
      collapsedColumns: [],
    },
  });
  showGroupBySelector.value = false;
};

// Обработка drop карточки
const handleDrop = (recordId: string, optionId: string | null) => {
  if (!groupByColumn.value) return;

  const record = props.records.find(r => r.id === recordId);
  if (!record) return;

  // Обновляем значение группирующей колонки
  emit('update-record', recordId, {
    ...record.data,
    [groupByColumn.value.id]: optionId,
  });
};

// Добавить карточку в колонку
const handleAddCard = (optionId: string | null) => {
  if (!groupByColumn.value) return;

  const data: { [columnId: string]: any } = {
    [groupByColumn.value.id]: optionId,
  };

  // Добавляем пустое значение для первой TEXT колонки (заголовок)
  const textColumn = props.database.columns.find(col => col.type === 'TEXT');
  if (textColumn) {
    data[textColumn.id] = '';
  }

  emit('create-record', data);
};

// Открыть карточку для редактирования
const handleCardClick = (recordId: string) => {
  editingRecordId.value = recordId;
};

// Получить редактируемую запись
const editingRecord = computed(() => {
  if (!editingRecordId.value) return null;
  return props.records.find(r => r.id === editingRecordId.value) || null;
});

// Обновить запись
const handleUpdateRecord = (recordId: string, data: { [columnId: string]: any }) => {
  emit('update-record', recordId, data);
  editingRecordId.value = null;
};

// Удалить запись
const handleDeleteRecord = (recordId: string) => {
  emit('delete-record', recordId);
  editingRecordId.value = null;
};

// Удалить карточку
const handleCardDelete = (recordId: string) => {
  emit('delete-record', recordId);
};

// Автоматически открыть селектор, если нет колонки группировки
watch(
  () => props.view.kanban?.groupByColumnId,
  (groupByColumnId) => {
    if (!groupByColumnId && hasSelectColumns.value && !showGroupBySelector.value) {
      setTimeout(() => {
        showGroupBySelector.value = true;
      }, 100);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.kanban-board {
  width: 100%;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.kanban-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  padding: 40px 20px;
  text-align: center;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.dark .empty-state-title {
  color: #f9fafb;
}

.empty-state-text {
  font-size: 14px;
  color: #6b7280;
  max-width: 400px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.dark .empty-state-text {
  color: #9ca3af;
}

.empty-state-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.empty-state-btn:hover {
  background: #2563eb;
}

.kanban-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.kanban-columns {
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
}

.kanban-columns::-webkit-scrollbar {
  height: 8px;
}

.kanban-columns::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.dark .kanban-columns::-webkit-scrollbar-track {
  background: #1f2937;
}

.kanban-columns::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.dark .kanban-columns::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.kanban-columns::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .kanban-columns::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dark .modal-content {
  background: #1f2937;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.dark .modal-title {
  color: #f9fafb;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.modal-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dark .modal-option {
  background: #111827;
  border-color: #374151;
}

.modal-option:hover {
  background: #eff6ff;
  border-color: #3b82f6;
}

.dark .modal-option:hover {
  background: #1e3a5f;
  border-color: #3b82f6;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.dark .option-name {
  color: #f9fafb;
}

.option-type {
  font-size: 12px;
  color: #6b7280;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.dark .option-type {
  color: #9ca3af;
  background: #374151;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.dark .modal-btn-cancel {
  background: #374151;
  color: #e5e7eb;
}

.modal-btn-cancel:hover {
  background: #e5e7eb;
}

.dark .modal-btn-cancel:hover {
  background: #4b5563;
}
</style>
