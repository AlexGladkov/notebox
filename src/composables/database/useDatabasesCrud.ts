import { ref } from 'vue';
import type { CustomDatabase } from '../../types';
import { databasesApi } from '../../api/databases';

export function useDatabasesCrud() {
  const databases = ref<CustomDatabase[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

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

  const loadDatabase = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      const database = await databasesApi.getById(id);

      // Load views from localStorage if not present
      if (!database.views || database.views.length === 0) {
        const storageKey = `database-views-${id}`;
        try {
          const storedData = localStorage.getItem(storageKey);
          const storedViews = storedData ? JSON.parse(storedData) : [];
          database.views = Array.isArray(storedViews) ? storedViews : [];
        } catch (e) {
          console.error('Failed to parse views from localStorage:', e);
          database.views = [];
        }
      }

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

  const getDatabaseById = (id: string) => {
    return databases.value.find(db => db.id === id);
  };

  return {
    databases,
    loading,
    error,
    loadDatabases,
    loadDatabase,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    getDatabaseById,
  };
}
