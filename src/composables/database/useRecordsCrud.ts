import { ref } from 'vue';
import type { Record } from '../../types';
import { databasesApi } from '../../api/databases';

export function useRecordsCrud() {
  const records = ref<Record[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadRecords = async (databaseId: string) => {
    try {
      loading.value = true;
      error.value = null;
      const dbRecords = await databasesApi.getRecords(databaseId);

      // Replace records for this database
      records.value = [
        ...records.value.filter(r => r.databaseId !== databaseId),
        ...dbRecords,
      ];

      return dbRecords;
    } catch (err) {
      console.error('Failed to load records:', err);
      error.value = 'Не удалось загрузить записи';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRecord = async (databaseId: string, data: { [columnId: string]: any }) => {
    try {
      const newRecord = await databasesApi.createRecord(databaseId, { data });
      records.value.push(newRecord);
      return newRecord;
    } catch (err) {
      console.error('Failed to create record:', err);
      error.value = 'Не удалось создать запись';
      throw err;
    }
  };

  const updateRecord = async (
    databaseId: string,
    recordId: string,
    data: { [columnId: string]: any }
  ) => {
    try {
      const updatedRecord = await databasesApi.updateRecord(databaseId, recordId, { data });

      const index = records.value.findIndex(r => r.id === recordId);
      if (index !== -1) {
        records.value[index] = updatedRecord;
      }

      return updatedRecord;
    } catch (err) {
      console.error('Failed to update record:', err);
      error.value = 'Не удалось обновить запись';
      throw err;
    }
  };

  const deleteRecord = async (databaseId: string, recordId: string) => {
    try {
      await databasesApi.deleteRecord(databaseId, recordId);
      records.value = records.value.filter(r => r.id !== recordId);
    } catch (err) {
      console.error('Failed to delete record:', err);
      error.value = 'Не удалось удалить запись';
      throw err;
    }
  };

  const getRecordsByDatabaseId = (databaseId: string) => {
    return records.value.filter(r => r.databaseId === databaseId);
  };

  return {
    records,
    loading,
    error,
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDatabaseId,
  };
}
