import { computed } from 'vue';
import {
  useDatabasesCrud,
  useColumnsCrud,
  useRecordsCrud,
  useRecordsBatch,
  useViewsCrud,
} from './database';

export function useDatabases() {
  const databasesCrud = useDatabasesCrud();
  const columnsCrud = useColumnsCrud(databasesCrud.databases);
  const recordsCrud = useRecordsCrud();
  const recordsBatch = useRecordsBatch(recordsCrud.records);
  const viewsCrud = useViewsCrud(databasesCrud.databases);

  return {
    // State
    databases: databasesCrud.databases,
    records: recordsCrud.records,
    loading: computed(() => databasesCrud.loading.value || recordsCrud.loading.value),
    error: computed(() =>
      databasesCrud.error.value ||
      columnsCrud.error.value ||
      recordsCrud.error.value ||
      recordsBatch.error.value ||
      viewsCrud.error.value
    ),

    // Database operations
    loadDatabases: databasesCrud.loadDatabases,
    loadDatabase: databasesCrud.loadDatabase,
    createDatabase: databasesCrud.createDatabase,
    updateDatabase: databasesCrud.updateDatabase,
    deleteDatabase: databasesCrud.deleteDatabase,
    getDatabaseById: databasesCrud.getDatabaseById,

    // Column operations
    addColumn: columnsCrud.addColumn,
    updateColumn: columnsCrud.updateColumn,
    deleteColumn: columnsCrud.deleteColumn,

    // Record operations
    loadRecords: recordsCrud.loadRecords,
    createRecord: recordsCrud.createRecord,
    updateRecord: recordsCrud.updateRecord,
    deleteRecord: recordsCrud.deleteRecord,
    getRecordsByDatabaseId: recordsCrud.getRecordsByDatabaseId,

    // Batch operations
    batchCreateRecords: recordsBatch.batchCreateRecords,
    batchDeleteRecords: recordsBatch.batchDeleteRecords,

    // View operations
    createView: viewsCrud.createView,
    updateView: viewsCrud.updateView,
    deleteView: viewsCrud.deleteView,
  };
}
