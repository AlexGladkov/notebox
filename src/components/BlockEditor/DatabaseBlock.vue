<template>
  <node-view-wrapper class="database-block">
    <div v-if="loading" class="database-loading">
      <div class="loading-spinner"></div>
      <span>Загрузка базы данных...</span>
    </div>

    <div v-else-if="error" class="database-error">
      <span>⚠️ Ошибка загрузки базы данных: {{ error }}</span>
    </div>

    <div v-else-if="database" class="database-container">
      <DatabaseViewTabs
        :views="views"
        :current-view-id="currentViewId"
        :columns="database.columns"
        @select-view="handleSelectView"
        @create-view="handleCreateView"
        @rename-view="handleRenameView"
        @delete-view="handleDeleteView"
      />
      <DatabaseToolbar
        v-if="currentView.type !== 'kanban'"
        :columns="database.columns"
        @filter-change="handleFilterChange"
        @sort-change="handleSortChange"
        @search-change="handleSearchChange"
        @import="handleImportClick"
        @export="handleExport"
      />
      <DatabaseTable
        v-if="!currentView.type || currentView.type === 'table'"
        :database="database"
        :records="filteredRecords"
        :filter="currentFilter"
        :sort="currentSort"
        :search-query="searchQuery"
        @update-record="handleUpdateRecord"
        @create-record="handleCreateRecord"
        @delete-record="handleDeleteRecord"
        @add-column="handleAddColumn"
        @update-column="handleUpdateColumn"
        @delete-column="handleDeleteColumn"
        @sort="handleTableSort"
      />
      <KanbanBoard
        v-else-if="currentView.type === 'kanban'"
        :database="database"
        :records="filteredRecords"
        :view="currentView"
        @update-record="handleUpdateRecord"
        @create-record="handleCreateRecord"
        @delete-record="handleDeleteRecord"
        @update-view="handleUpdateView"
      />
    </div>

    <div v-else class="database-error">
      <span>⚠️ База данных не найдена</span>
    </div>

    <!-- CSV Import Dialog -->
    <CsvImportDialog
      :show="showImportDialog"
      :columns="database?.columns || []"
      @cancel="showImportDialog = false"
      @import="handleImport"
    />

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.visible" class="toast" :class="{ 'toast-error': toast.isError }">
        {{ toast.message }}
      </div>
    </Transition>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { NodeViewWrapper } from '@tiptap/vue-3';
import DatabaseViewTabs from './DatabaseViewTabs.vue';
import DatabaseToolbar from './DatabaseToolbar.vue';
import DatabaseTable from './DatabaseTable.vue';
import KanbanBoard from './KanbanBoard.vue';
import CsvImportDialog from './CsvImportDialog.vue';
import type { ImportData } from './CsvImportDialog.vue';
import { useDatabases } from '../../composables/useDatabases';
import { useDatabaseFiltering, useDatabaseImport, useDatabaseExport } from './Database/composables';
import type { ColumnType, SelectOption, Record } from '../../types';
import type { DatabaseView, DatabaseFilter, DatabaseSort } from '../../types/database';

interface Props {
  node: {
    attrs: {
      databaseId: string;
    };
  };
  editor: {
    state: any;
    view: any;
  };
  getPos: () => number;
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
}

const props = defineProps<Props>();

const {
  loadDatabase,
  loadRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  addColumn,
  updateColumn,
  deleteColumn,
  getDatabaseById,
  getRecordsByDatabaseId,
  createView,
  updateView,
  deleteView,
  batchCreateRecords,
  batchDeleteRecords,
} = useDatabases();

const loading = ref(false);
const error = ref<string | null>(null);
const currentViewId = ref<string>('');
const currentFilter = ref<DatabaseFilter | null>(null);
const currentSort = ref<DatabaseSort | null>(null);
const searchQuery = ref('');
const showImportDialog = ref(false);
const toast = ref({ visible: false, message: '', isError: false });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string, isError = false) => {
  toast.value = { visible: true, message, isError };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value.visible = false;
  }, 3000);
};

const database = computed(() => {
  return getDatabaseById(props.node.attrs.databaseId);
});

const databaseRecords = computed(() => {
  return getRecordsByDatabaseId(props.node.attrs.databaseId);
});

const views = computed(() => {
  if (!database.value?.views || database.value.views.length === 0) {
    // Create default view if no views exist
    return [{
      id: 'default',
      name: 'Все',
    } as DatabaseView];
  }
  return database.value.views;
});

const currentView = computed(() => {
  return views.value.find(v => v.id === currentViewId.value) || views.value[0];
});

// Use database filtering composable
const databaseColumns = computed(() => database.value?.columns || []);
const { filteredRecords } = useDatabaseFiltering(
  databaseRecords,
  databaseColumns,
  currentFilter,
  currentSort,
  searchQuery
);

const loadData = async () => {
  if (!props.node.attrs.databaseId) {
    error.value = 'ID базы данных не указан';
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    await loadDatabase(props.node.attrs.databaseId);
    await loadRecords(props.node.attrs.databaseId);

    // Set initial view
    if (views.value.length > 0) {
      currentViewId.value = views.value[0].id;
      const view = views.value[0];
      currentFilter.value = view.filter || null;
      currentSort.value = view.sort || null;
    }
  } catch (err) {
    console.error('Failed to load database data:', err);
    error.value = err instanceof Error ? err.message : 'Неизвестная ошибка';
  } finally {
    loading.value = false;
  }
};

const handleSelectView = (viewId: string) => {
  currentViewId.value = viewId;
  const view = views.value.find(v => v.id === viewId);
  if (view) {
    currentFilter.value = view.filter || null;
    currentSort.value = view.sort || null;
  }
};

const handleCreateView = async (name: string, type: 'table' | 'kanban', groupByColumnId?: string) => {
  try {
    const viewData: Omit<DatabaseView, 'id'> = {
      name,
      type,
      filter: currentFilter.value || undefined,
      sort: currentSort.value || undefined,
    };

    // Добавляем конфигурацию kanban
    if (type === 'kanban' && groupByColumnId) {
      viewData.kanban = {
        groupByColumnId,
        cardFields: [],
        columnOrder: [],
        collapsedColumns: [],
      };
    }

    const newView = await createView(props.node.attrs.databaseId, viewData);
    currentViewId.value = newView.id;
    showToast('Представление успешно создано');
  } catch (err) {
    console.error('Failed to create view:', err);
    showToast('Не удалось создать представление', true);
  }
};

const handleRenameView = async (viewId: string) => {
  const view = views.value.find(v => v.id === viewId);
  if (!view) return;

  const name = prompt('Введите новое название:', view.name);
  if (!name || name === view.name) return;

  try {
    await updateView(props.node.attrs.databaseId, viewId, { name });
    showToast('Вьюха успешно переименована');
  } catch (err) {
    console.error('Failed to rename view:', err);
    showToast('Не удалось переименовать вьюху', true);
  }
};

const handleDeleteView = async (viewId: string) => {
  if (views.value.length <= 1) {
    showToast('Нельзя удалить последнюю вьюху', true);
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить эту вьюху?')) return;

  try {
    await deleteView(props.node.attrs.databaseId, viewId);

    // Switch to first view if current was deleted
    if (currentViewId.value === viewId) {
      currentViewId.value = views.value[0].id;
      handleSelectView(views.value[0].id);
    }
    showToast('Вьюха успешно удалена');
  } catch (err) {
    console.error('Failed to delete view:', err);
    showToast('Не удалось удалить вьюху', true);
  }
};

const handleFilterChange = async (filter: DatabaseFilter | null) => {
  currentFilter.value = filter;

  // Update current view if it's not the default view
  if (currentViewId.value !== 'default') {
    try {
      await updateView(props.node.attrs.databaseId, currentViewId.value, {
        filter: filter || undefined,
      });
    } catch (err) {
      console.error('Failed to update view filter:', err);
    }
  }
};

const handleSortChange = async (sort: DatabaseSort | null) => {
  currentSort.value = sort;

  // Update current view if it's not the default view
  if (currentViewId.value !== 'default') {
    try {
      await updateView(props.node.attrs.databaseId, currentViewId.value, {
        sort: sort || undefined,
      });
    } catch (err) {
      console.error('Failed to update view sort:', err);
    }
  }
};

const handleSearchChange = (query: string) => {
  searchQuery.value = query;
};

const handleUpdateRecord = async (recordId: string, data: { [columnId: string]: any }) => {
  try {
    await updateRecord(props.node.attrs.databaseId, recordId, data);
  } catch (err) {
    console.error('Failed to update record:', err);
    showToast('Не удалось обновить запись', true);
  }
};

const handleCreateRecord = async (data: { [columnId: string]: any }) => {
  try {
    await createRecord(props.node.attrs.databaseId, data);
  } catch (err) {
    console.error('Failed to create record:', err);
    showToast('Не удалось создать запись', true);
  }
};

const handleDeleteRecord = async (recordId: string) => {
  try {
    await deleteRecord(props.node.attrs.databaseId, recordId);
  } catch (err) {
    console.error('Failed to delete record:', err);
    showToast('Не удалось удалить запись', true);
  }
};

const handleAddColumn = async (name: string, type: ColumnType, options?: SelectOption[]) => {
  try {
    const position = database.value?.columns.length || 0;
    await addColumn(props.node.attrs.databaseId, { name, type, position, options });
  } catch (err) {
    console.error('Failed to add column:', err);
    showToast('Не удалось добавить колонку', true);
  }
};

const handleUpdateColumn = async (
  columnId: string,
  name: string,
  type: ColumnType,
  options?: SelectOption[]
) => {
  try {
    await updateColumn(props.node.attrs.databaseId, columnId, { name, type, options });
  } catch (err) {
    console.error('Failed to update column:', err);
    showToast('Не удалось обновить колонку', true);
  }
};

const handleDeleteColumn = async (columnId: string) => {
  try {
    await deleteColumn(props.node.attrs.databaseId, columnId);
  } catch (err) {
    console.error('Failed to delete column:', err);
    showToast('Не удалось удалить колонку', true);
  }
};

const handleTableSort = async (columnId: string, direction: 'asc' | 'desc') => {
  const newSort: DatabaseSort = { columnId, direction };
  await handleSortChange(newSort);
};

const handleUpdateView = async (updates: Partial<DatabaseView>) => {
  try {
    await updateView(props.node.attrs.databaseId, currentViewId.value, updates);
  } catch (err) {
    console.error('Failed to update view:', err);
    showToast('Не удалось обновить представление', true);
  }
};

// Use database export composable
const { handleExport: exportDatabase } = useDatabaseExport({
  showToast,
});

const handleImportClick = () => {
  showImportDialog.value = true;
};

const handleExport = () => {
  if (!database.value) {
    showToast('База данных не загружена', true);
    return;
  }
  exportDatabase(database.value.name, database.value.columns, filteredRecords.value);
};

// Wrapper functions for import composable to adapt signatures
const addColumnForImport = async (databaseId: string, name: string, type: ColumnType, options?: SelectOption[]) => {
  const position = database.value?.columns.length || 0;
  return addColumn(databaseId, { name, type, position, options });
};

const updateColumnForImport = async (databaseId: string, columnId: string, name: string, type: ColumnType, options?: SelectOption[]) => {
  await updateColumn(databaseId, columnId, { name, type, options });
};

// Use database import composable
const { handleImport: importDatabase } = useDatabaseImport({
  addColumn: addColumnForImport,
  updateColumn: updateColumnForImport,
  batchCreateRecords,
  batchDeleteRecords,
  getRecordsByDatabaseId,
  showToast,
});

const handleImport = async (importData: ImportData) => {
  if (!database.value) {
    showToast('База данных не загружена', true);
    return;
  }

  const success = await importDatabase(
    props.node.attrs.databaseId,
    database.value.columns,
    importData
  );

  if (success) {
    showImportDialog.value = false;
  }
};

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

watch(() => props.node.attrs.databaseId, () => {
  loadData();
});
</script>

<style scoped>
.database-block {
  margin: 16px 0;
  width: 100%;
}

.database-loading,
.database-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 14px;
}

.database-error {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.database-container {
  width: 100%;
  overflow-x: auto;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

.toast-error {
  background: #dc2626;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* Dark theme */
.dark .database-loading,
.dark .database-error {
  background: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

.dark .database-error {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fca5a5;
}

.dark .loading-spinner {
  border-color: #374151;
  border-top-color: #60a5fa;
}

.dark .toast {
  background: #f9fafb;
  color: #111827;
}

.dark .toast-error {
  background: #ef4444;
  color: white;
}
</style>
