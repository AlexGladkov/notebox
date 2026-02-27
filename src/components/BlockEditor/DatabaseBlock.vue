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
      <DatabaseTable
        :database="database"
        :records="databaseRecords"
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
import DatabaseTable from './DatabaseTable.vue';
import { useDatabases } from '../../composables/useDatabases';
import type { Column, ColumnType, SelectOption } from '../../types';

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
} = useDatabases();

const loading = ref(false);
const error = ref<string | null>(null);

const database = computed(() => {
  return getDatabaseById(props.node.attrs.databaseId);
});

const databaseRecords = computed(() => {
  return getRecordsByDatabaseId(props.node.attrs.databaseId);
});

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
  } catch (err) {
    console.error('Failed to load database data:', err);
    error.value = err instanceof Error ? err.message : 'Неизвестная ошибка';
  } finally {
    loading.value = false;
  }
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
