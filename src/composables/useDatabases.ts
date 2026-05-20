import { storeToRefs } from 'pinia';
import { useDatabasesStore } from '../stores/databasesStore';

export function useDatabases() {
  const store = useDatabasesStore();
  const { databases, records, loading, error } = storeToRefs(store);

  return {
    // State
    databases,
    records,
    loading,
    error,

    // Database operations
    loadDatabases: store.loadDatabases,
    loadDatabase: store.loadDatabase,
    createDatabase: store.createDatabase,
    updateDatabase: store.updateDatabase,
    deleteDatabase: store.deleteDatabase,
    getDatabaseById: store.getDatabaseById,

    // Column operations
    addColumn: store.addColumn,
    updateColumn: store.updateColumn,
    deleteColumn: store.deleteColumn,

    // Record operations
    loadRecords: store.loadRecords,
    createRecord: store.createRecord,
    updateRecord: store.updateRecord,
    deleteRecord: store.deleteRecord,
    getRecordsByDatabaseId: store.getRecordsByDatabaseId,

    // Batch operations
    batchCreateRecords: async (dbId: string, recordsData: any[]) => {
      for (const data of recordsData) {
        await store.createRecord(dbId, data);
      }
    },
    batchDeleteRecords: async (dbId: string, recordIds: string[]) => {
      for (const id of recordIds) {
        await store.deleteRecord(dbId, id);
      }
    },

    // View operations
    createView: store.createView,
    updateView: store.updateView,
    deleteView: store.deleteView,
  };
}
