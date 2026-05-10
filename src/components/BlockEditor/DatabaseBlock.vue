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
        @select-view="handleSelectView"
        @create-view="handleCreateView"
        @rename-view="handleRenameView"
        @delete-view="handleDeleteView"
      />
      <DatabaseToolbar
        :columns="database.columns"
        @filter-change="handleFilterChange"
        @sort-change="handleSortChange"
        @search-change="handleSearchChange"
        @import="handleImportClick"
        @export="handleExport"
      />
      <DatabaseTable
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
import CsvImportDialog from './CsvImportDialog.vue';
import type { ImportData } from './CsvImportDialog.vue';
import { useDatabases } from '../../composables/useDatabases';
import { exportToCsv, downloadCsv, generateCsvFilename } from '../../utils/csvExporter';
import type { Column, ColumnType, SelectOption, Record } from '../../types';
import type { DatabaseView, DatabaseFilter, DatabaseSort } from '../../types/database';

interface Props {
  node: {
    attrs: {
      databaseId: string;
    };
  };
  editor: any;
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

const filteredRecords = computed(() => {
  let records = [...databaseRecords.value];

  // Apply filter
  if (currentFilter.value) {
    records = applyFilter(records, currentFilter.value);
  }

  // Apply search
  if (searchQuery.value) {
    records = applySearch(records, searchQuery.value);
  }

  // Apply sort
  if (currentSort.value) {
    records = applySort(records, currentSort.value);
  }

  return records;
});

const applyFilter = (records: Record[], filter: DatabaseFilter): Record[] => {
  return records.filter(record => {
    const value = record.data[filter.columnId];
    const column = database.value?.columns.find(c => c.id === filter.columnId);

    switch (filter.operator) {
      case 'isEmpty':
        return value === null || value === undefined || value === '';
      case 'isNotEmpty':
        return value !== null && value !== undefined && value !== '';
      case 'equals':
        // Для Select/MultiSelect колонок нужно сравнивать label
        if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
          if (!value) return false;
          const option = column.options?.find(o => o.id === value);
          return option?.label === filter.value;
        }
        return value === filter.value;
      case 'contains':
        // Для Select/MultiSelect также ищем по label
        if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
          if (!value) return false;
          const option = column.options?.find(o => o.id === value);
          return option?.label.toLowerCase().includes(String(filter.value).toLowerCase());
        }
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'gt':
        return Number(value) > Number(filter.value);
      case 'lt':
        return Number(value) < Number(filter.value);
      case 'gte':
        return Number(value) >= Number(filter.value);
      case 'lte':
        return Number(value) <= Number(filter.value);
      default:
        return true;
    }
  });
};

const applySearch = (records: Record[], query: string): Record[] => {
  const lowerQuery = query.toLowerCase();
  return records.filter(record => {
    return Object.entries(record.data).some(([columnId, value]) => {
      if (value === null || value === undefined) return false;

      // Find column to check if it's SELECT or MULTI_SELECT
      const column = database.value?.columns.find(c => c.id === columnId);
      if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
        // Search in option labels
        if (column.type === 'SELECT') {
          const option = column.options?.find(o => o.id === value);
          return option?.label.toLowerCase().includes(lowerQuery);
        } else if (column.type === 'MULTI_SELECT' && Array.isArray(value)) {
          return value.some(optionId => {
            const option = column.options?.find(o => o.id === optionId);
            return option?.label.toLowerCase().includes(lowerQuery);
          });
        }
      }

      // Search in plain text values
      return String(value).toLowerCase().includes(lowerQuery);
    });
  });
};

const applySort = (records: Record[], sort: DatabaseSort): Record[] => {
  return [...records].sort((a, b) => {
    const aValue = a.data[sort.columnId];
    const bValue = b.data[sort.columnId];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sort.direction === 'asc' ? comparison : -comparison;
  });
};

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

const handleCreateView = async () => {
  const name = prompt('Введите название новой вьюхи:');
  if (!name) return;

  try {
    const newView = await createView(props.node.attrs.databaseId, {
      name,
      filter: currentFilter.value || undefined,
      sort: currentSort.value || undefined,
    });
    currentViewId.value = newView.id;
    showToast('Вьюха успешно создана');
  } catch (err) {
    console.error('Failed to create view:', err);
    showToast('Не удалось создать вьюху', true);
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
    await addColumn(props.node.attrs.databaseId, name, type, options);
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
    await updateColumn(props.node.attrs.databaseId, columnId, name, type, options);
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

const handleImportClick = () => {
  showImportDialog.value = true;
};

const handleExport = () => {
  if (!database.value) {
    showToast('База данных не загружена', true);
    return;
  }

  try {
    // Экспортируем отфильтрованные записи
    const recordsToExport = filteredRecords.value;
    const csvContent = exportToCsv(database.value.columns, recordsToExport);
    const filename = generateCsvFilename(database.value.name);
    downloadCsv(csvContent, filename, 'utf-8-bom');
    showToast(`Экспортировано записей: ${recordsToExport.length}`);
  } catch (err) {
    console.error('Failed to export CSV:', err);
    showToast('Не удалось экспортировать CSV', true);
  }
};

const handleImport = async (importData: ImportData) => {
  if (!database.value) {
    showToast('База данных не загружена', true);
    return;
  }

  try {
    // Создаём новые колонки если нужно
    const columnIdMap = new Map<string, string>(); // Map временный ID -> реальный ID

    if (importData.newColumns && importData.newColumns.length > 0 && importData.tempColumnIds) {
      const createdColumns = [];
      for (const newCol of importData.newColumns) {
        const column = await addColumn(
          props.node.attrs.databaseId,
          newCol.name,
          newCol.type
        );
        if (!column) {
          throw new Error(`Не удалось создать колонку: ${newCol.name}`);
        }
        createdColumns.push(column);
      }

      // Создаем маппинг временных ID на реальные ID
      for (const [tempId, colIndex] of importData.tempColumnIds.entries()) {
        const realColumn = createdColumns[colIndex];
        if (realColumn) {
          columnIdMap.set(tempId, realColumn.id);
        }
      }
    }

    // Обрабатываем SELECT поля - создаём недостающие опции
    const selectColumnsToUpdate = new Map<string, { column: Column; newOptions: Set<string> }>();

    for (const record of importData.records) {
      for (const [tempColumnId, value] of Object.entries(record)) {
        const actualColumnId = columnIdMap.get(tempColumnId) || tempColumnId;
        const column = database.value.columns.find(c => c.id === actualColumnId);

        if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
          // Проверяем, есть ли строковые значения (не ID)
          const values = column.type === 'MULTI_SELECT' && Array.isArray(value) ? value : [value];

          for (const val of values) {
            if (typeof val === 'string' && val) {
              // Это строка, а не ID - нужно создать опцию
              const existingOption = column.options?.find(opt => opt.id === val || opt.label.toLowerCase() === val.toLowerCase());
              if (!existingOption) {
                // Добавляем в список новых опций для этой колонки
                if (!selectColumnsToUpdate.has(actualColumnId)) {
                  selectColumnsToUpdate.set(actualColumnId, { column, newOptions: new Set() });
                }
                selectColumnsToUpdate.get(actualColumnId)!.newOptions.add(val);
              }
            }
          }
        }
      }
    }

    // Создаём новые опции для SELECT колонок
    const optionIdMap = new Map<string, string>(); // Map label -> новый ID опции
    for (const [columnId, { column, newOptions }] of selectColumnsToUpdate.entries()) {
      const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange'];
      const updatedOptions = [...(column.options || [])];

      for (const label of newOptions) {
        const newOptionId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const color = colors[updatedOptions.length % colors.length];
        updatedOptions.push({ id: newOptionId, label, color });
        optionIdMap.set(`${columnId}:${label}`, newOptionId);
      }

      // Обновляем колонку с новыми опциями
      await updateColumn(
        props.node.attrs.databaseId,
        columnId,
        column.name,
        column.type,
        updatedOptions
      );
    }

    // Преобразуем записи с учётом новых колонок и опций
    const recordsToImport = importData.records.map(record => {
      const transformedRecord: { [columnId: string]: any } = {};
      for (const [tempColumnId, value] of Object.entries(record)) {
        const actualColumnId = columnIdMap.get(tempColumnId) || tempColumnId;
        const column = database.value.columns.find(c => c.id === actualColumnId);

        let transformedValue = value;

        // Преобразуем строковые значения SELECT полей в ID опций
        if (column && (column.type === 'SELECT' || column.type === 'MULTI_SELECT')) {
          if (column.type === 'SELECT' && typeof value === 'string') {
            // Ищем опцию по label или берём ID из карты новых опций
            const existingOption = column.options?.find(opt => opt.label.toLowerCase() === value.toLowerCase());
            transformedValue = existingOption?.id || optionIdMap.get(`${actualColumnId}:${value}`) || value;
          } else if (column.type === 'MULTI_SELECT' && Array.isArray(value)) {
            transformedValue = value.map(val => {
              if (typeof val === 'string') {
                const existingOption = column.options?.find(opt => opt.label.toLowerCase() === val.toLowerCase());
                return existingOption?.id || optionIdMap.get(`${actualColumnId}:${val}`) || val;
              }
              return val;
            });
          }
        }

        transformedRecord[actualColumnId] = transformedValue;
      }
      return transformedRecord;
    });

    // Если режим "заменить" - удаляем существующие записи
    if (importData.mode === 'replace') {
      const existingRecords = getRecordsByDatabaseId(props.node.attrs.databaseId);
      if (existingRecords.length > 0) {
        const confirmed = confirm(
          `Вы уверены, что хотите удалить все существующие записи (${existingRecords.length}) и заменить их импортированными данными?`
        );
        if (!confirmed) {
          showImportDialog.value = false;
          return;
        }
        await batchDeleteRecords(
          props.node.attrs.databaseId,
          existingRecords.map(r => r.id)
        );
      }
    }

    // Создаём новые записи
    await batchCreateRecords(props.node.attrs.databaseId, recordsToImport);

    showToast(`Успешно импортировано записей: ${recordsToImport.length}`);
    showImportDialog.value = false;
  } catch (err) {
    console.error('Failed to import CSV:', err);
    showToast('Не удалось импортировать CSV', true);
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
  z-index: 2000;
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
</style>
