import { ref } from 'vue';
import type { CustomDatabase, Column, Record, ColumnType, SelectOption } from '../types';
import type { DatabaseView } from '../types/database';
import { databasesApi } from '../api/databases';

export function useDatabases() {
  const databases = ref<CustomDatabase[]>([]);
  const records = ref<Record[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Load all databases
  const loadDatabases = async () => {
    try {
      loading.value = true;
      error.value = null;
      databases.value = await databasesApi.getAll();
    } catch (err) {
      console.error('Failed to load databases:', err);
      error.value = 'Не удалось загрузить базы данных';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load a single database
  const loadDatabase = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      const database = await databasesApi.getById(id);

      // Update in the list if exists, otherwise add
      const index = databases.value.findIndex(db => db.id === id);
      if (index !== -1) {
        databases.value[index] = database;
      } else {
        databases.value.push(database);
      }

      return database;
    } catch (err) {
      console.error('Failed to load database:', err);
      error.value = 'Не удалось загрузить базу данных';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create a new database
  const createDatabase = async (name: string, folderId: string | null = null) => {
    try {
      loading.value = true;
      error.value = null;

      const newDatabase = await databasesApi.create({ name, folderId });

      // Add default "Name" column
      const nameColumn = await databasesApi.addColumn(newDatabase.id, {
        name: 'Name',
        type: 'TEXT',
        position: 0,
      });

      newDatabase.columns = [nameColumn];
      databases.value.push(newDatabase);

      return newDatabase;
    } catch (err) {
      console.error('Failed to create database:', err);
      error.value = 'Не удалось создать базу данных';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update database
  const updateDatabase = async (id: string, name: string, folderId: string | null = null) => {
    try {
      const updatedDatabase = await databasesApi.update(id, { name, folderId });

      const index = databases.value.findIndex(db => db.id === id);
      if (index !== -1) {
        databases.value[index] = updatedDatabase;
      }

      return updatedDatabase;
    } catch (err) {
      console.error('Failed to update database:', err);
      error.value = 'Не удалось обновить базу данных';
      throw err;
    }
  };

  // Delete database
  const deleteDatabase = async (id: string) => {
    try {
      await databasesApi.delete(id);
      databases.value = databases.value.filter(db => db.id !== id);
    } catch (err) {
      console.error('Failed to delete database:', err);
      error.value = 'Не удалось удалить базу данных';
      throw err;
    }
  };

  // Add column to database
  const addColumn = async (
    databaseId: string,
    name: string,
    type: ColumnType,
    options?: SelectOption[]
  ) => {
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

      database.columns.push(newColumn);
      return newColumn;
    } catch (err) {
      console.error('Failed to add column:', err);
      error.value = 'Не удалось добавить колонку';
      throw err;
    }
  };

  // Update column
  const updateColumn = async (
    databaseId: string,
    columnId: string,
    name: string,
    type: ColumnType,
    options?: SelectOption[]
  ) => {
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
        database.columns[columnIndex] = updatedColumn;
      }

      return updatedColumn;
    } catch (err) {
      console.error('Failed to update column:', err);
      error.value = 'Не удалось обновить колонку';
      throw err;
    }
  };

  // Delete column
  const deleteColumn = async (databaseId: string, columnId: string) => {
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

  // Load records for a database
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

  // Create record
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

  // Update record
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

  // Delete record
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

  // Get records for a specific database
  const getRecordsByDatabaseId = (databaseId: string) => {
    return records.value.filter(r => r.databaseId === databaseId);
  };

  // Get database by ID
  const getDatabaseById = (id: string) => {
    return databases.value.find(db => db.id === id);
  };

  // Create view
  const createView = async (databaseId: string, view: Omit<DatabaseView, 'id'>) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      const newView = await databasesApi.createView(databaseId, view);

      if (!database.views) {
        database.views = [];
      }
      database.views.push(newView);

      return newView;
    } catch (err) {
      console.error('Failed to create view:', err);
      error.value = 'Не удалось создать вьюху';
      throw err;
    }
  };

  // Update view
  const updateView = async (databaseId: string, viewId: string, view: Partial<DatabaseView>) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      const updatedView = await databasesApi.updateView(databaseId, viewId, view);

      const viewIndex = database.views?.findIndex(v => v.id === viewId);
      if (viewIndex !== undefined && viewIndex !== -1 && database.views) {
        database.views[viewIndex] = updatedView;
      }

      return updatedView;
    } catch (err) {
      console.error('Failed to update view:', err);
      error.value = 'Не удалось обновить вьюху';
      throw err;
    }
  };

  // Delete view
  const deleteView = async (databaseId: string, viewId: string) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      await databasesApi.deleteView(databaseId, viewId);

      if (database.views) {
        database.views = database.views.filter(v => v.id !== viewId);
      }
    } catch (err) {
      console.error('Failed to delete view:', err);
      error.value = 'Не удалось удалить вьюху';
      throw err;
    }
  };

  return {
    databases,
    records,
    loading,
    error,
    loadDatabases,
    loadDatabase,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    addColumn,
    updateColumn,
    deleteColumn,
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDatabaseId,
    getDatabaseById,
    createView,
    updateView,
    deleteView,
  };
}
