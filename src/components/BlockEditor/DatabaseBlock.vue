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
      />
    </div>

    <div v-else class="database-error">
      <span>⚠️ База данных не найдена</span>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { NodeViewWrapper } from '@tiptap/vue-3';
import DatabaseViewTabs from './DatabaseViewTabs.vue';
import DatabaseToolbar from './DatabaseToolbar.vue';
import DatabaseTable from './DatabaseTable.vue';
import { useDatabases } from '../../composables/useDatabases';
import type { Column, ColumnType, SelectOption, Record } from '../../types';
import type { DatabaseView, DatabaseFilter, DatabaseSort } from '../../types/database';

const props = defineProps<{
  node: {
    attrs: {
      databaseId: string;
    };
  };
}>();

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
} = useDatabases();

const loading = ref(false);
const error = ref<string | null>(null);
const currentViewId = ref<string>('');
const currentFilter = ref<DatabaseFilter | null>(null);
const currentSort = ref<DatabaseSort | null>(null);
const searchQuery = ref('');

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

    switch (filter.operator) {
      case 'isEmpty':
        return value === null || value === undefined || value === '';
      case 'isNotEmpty':
        return value !== null && value !== undefined && value !== '';
      case 'equals':
        return value === filter.value;
      case 'contains':
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
    return Object.values(record.data).some(value => {
      if (value === null || value === undefined) return false;
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
  } catch (err) {
    console.error('Failed to create view:', err);
    alert('Не удалось создать вьюху');
  }
};

const handleRenameView = async (viewId: string) => {
  const view = views.value.find(v => v.id === viewId);
  if (!view) return;

  const name = prompt('Введите новое название:', view.name);
  if (!name || name === view.name) return;

  try {
    await updateView(props.node.attrs.databaseId, viewId, { name });
  } catch (err) {
    console.error('Failed to rename view:', err);
    alert('Не удалось переименовать вьюху');
  }
};

const handleDeleteView = async (viewId: string) => {
  if (views.value.length <= 1) {
    alert('Нельзя удалить последнюю вьюху');
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
  } catch (err) {
    console.error('Failed to delete view:', err);
    alert('Не удалось удалить вьюху');
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
  }
};

const handleCreateRecord = async (data: { [columnId: string]: any }) => {
  try {
    await createRecord(props.node.attrs.databaseId, data);
  } catch (err) {
    console.error('Failed to create record:', err);
  }
};

const handleDeleteRecord = async (recordId: string) => {
  try {
    await deleteRecord(props.node.attrs.databaseId, recordId);
  } catch (err) {
    console.error('Failed to delete record:', err);
  }
};

const handleAddColumn = async (name: string, type: ColumnType, options?: SelectOption[]) => {
  try {
    await addColumn(props.node.attrs.databaseId, name, type, options);
  } catch (err) {
    console.error('Failed to add column:', err);
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
  }
};

const handleDeleteColumn = async (columnId: string) => {
  try {
    await deleteColumn(props.node.attrs.databaseId, columnId);
  } catch (err) {
    console.error('Failed to delete column:', err);
  }
};

onMounted(() => {
  loadData();
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
</style>
