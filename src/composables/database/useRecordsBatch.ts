import { ref, type Ref } from 'vue';
import type { Record } from '../../types';
import { databasesApi } from '../../api/databases';

export function useRecordsBatch(records: Ref<Record[]>) {
  const error = ref<string | null>(null);

  const batchCreateRecords = async (
    databaseId: string,
    recordsData: Array<{ [columnId: string]: any }>,
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      const createdRecords: Record[] = [];
      const BATCH_SIZE = 50;

      for (let i = 0; i < recordsData.length; i += BATCH_SIZE) {
        const batch = recordsData.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(data =>
          databasesApi.createRecord(databaseId, { data }).catch(err => {
            console.error('Failed to create record:', err);
            return null;
          })
        );

        const batchResults = await Promise.all(batchPromises);

        const successfulRecords = batchResults.filter(r => r !== null) as Record[];
        createdRecords.push(...successfulRecords);

        if (onProgress) {
          onProgress(Math.min(i + BATCH_SIZE, recordsData.length), recordsData.length);
        }
      }

      records.value = [...records.value, ...createdRecords];
      return createdRecords;
    } catch (err) {
      console.error('Failed to batch create records:', err);
      error.value = 'Не удалось создать записи';
      throw err;
    }
  };

  const batchDeleteRecords = async (
    databaseId: string,
    recordIds: string[],
    onProgress?: (current: number, total: number) => void
  ) => {
    try {
      const BATCH_SIZE = 50;
      const deletedIds: string[] = [];

      for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
        const batch = recordIds.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(recordId =>
          databasesApi.deleteRecord(databaseId, recordId)
            .then(() => recordId)
            .catch(err => {
              console.error(`Failed to delete record ${recordId}:`, err);
              return null;
            })
        );

        const batchResults = await Promise.all(batchPromises);

        const successfulIds = batchResults.filter(id => id !== null) as string[];
        deletedIds.push(...successfulIds);

        if (onProgress) {
          onProgress(Math.min(i + BATCH_SIZE, recordIds.length), recordIds.length);
        }
      }

      records.value = records.value.filter(r => !deletedIds.includes(r.id));
    } catch (err) {
      console.error('Failed to batch delete records:', err);
      error.value = 'Не удалось удалить записи';
      throw err;
    }
  };

  return {
    error,
    batchCreateRecords,
    batchDeleteRecords,
  };
}
