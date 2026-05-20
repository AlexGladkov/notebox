import { ref, type Ref } from 'vue';
import type { CustomDatabase, ColumnType, SelectOption, Column } from '../../types';
import { databasesApi } from '../../api/databases';

export function useColumnsCrud(databases: Ref<CustomDatabase[]>) {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const addColumn = async (
    databaseId: string,
    name: string,
    type: ColumnType,
    options?: SelectOption[]
  ): Promise<Column> => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      const position = database.columns.length;
      const newColumn = await databasesApi.addColumn(databaseId, {
        name,
        type,
        options,
        position,
      });

      database.columns = [...database.columns, newColumn];
      return newColumn;
    } catch (err) {
      console.error('Failed to add column:', err);
      error.value = 'Не удалось добавить колонку';
      throw err;
    }
  };

  const updateColumn = async (
    databaseId: string,
    columnId: string,
    name: string,
    type: ColumnType,
    options?: SelectOption[]
  ): Promise<Column> => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      const column = database.columns.find(col => col.id === columnId);
      if (!column) {
        throw new Error('Column not found');
      }

      const updatedColumn = await databasesApi.updateColumn(databaseId, columnId, {
        name,
        type,
        options,
        position: column.position,
      });

      const columnIndex = database.columns.findIndex(col => col.id === columnId);
      if (columnIndex !== -1) {
        database.columns = [
          ...database.columns.slice(0, columnIndex),
          updatedColumn,
          ...database.columns.slice(columnIndex + 1),
        ];
      }

      return updatedColumn;
    } catch (err) {
      console.error('Failed to update column:', err);
      error.value = 'Не удалось обновить колонку';
      throw err;
    }
  };

  const deleteColumn = async (databaseId: string, columnId: string): Promise<void> => {
    try {
      await databasesApi.deleteColumn(databaseId, columnId);

      const database = databases.value.find(db => db.id === databaseId);
      if (database) {
        database.columns = database.columns.filter(col => col.id !== columnId);
      }
    } catch (err) {
      console.error('Failed to delete column:', err);
      error.value = 'Не удалось удалить колонку';
      throw err;
    }
  };

  return {
    loading,
    error,
    addColumn,
    updateColumn,
    deleteColumn,
  };
}
