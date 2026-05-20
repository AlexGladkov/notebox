import { defineStore } from 'pinia';
import type { CustomDatabase, Record, RecordData, Column, ColumnType } from '../types';
import type { DatabaseView } from '../types/database';
import { databasesApi, type UpdateColumnRequest } from '../api/databases';

export const useDatabasesStore = defineStore('databases', {
  state: () => ({
    databases: [] as CustomDatabase[],
    records: [] as Record[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getDatabaseById: (state) => (id: string) => state.databases.find(db => db.id === id),
    getRecordsByDatabaseId: (state) => (dbId: string) => state.records.filter(r => r.databaseId === dbId),
  },

  actions: {
    async loadDatabases(): Promise<void> {
      try {
        this.loading = true;
        this.error = null;
        this.databases = await databasesApi.getAll();
      } catch (err) {
        console.error('Failed to load databases:', err);
        this.error = 'Не удалось загрузить базы данных';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async loadDatabase(id: string): Promise<CustomDatabase> {
      try {
        this.loading = true;
        this.error = null;
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
        const index = this.databases.findIndex(db => db.id === id);
        if (index !== -1) {
          this.databases[index] = database;
        } else {
          this.databases.push(database);
        }

        return database;
      } catch (err) {
        console.error('Failed to load database:', err);
        this.error = 'Не удалось загрузить базу данных';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async createDatabase(name: string, folderId: string | null = null): Promise<CustomDatabase> {
      try {
        this.loading = true;
        this.error = null;

        const newDatabase = await databasesApi.create({ name, folderId });

        // Add default "Name" column
        const nameColumn = await databasesApi.addColumn(newDatabase.id, {
          name: 'Name',
          type: 'TEXT',
          position: 0,
        });

        newDatabase.columns = [nameColumn];
        this.databases.push(newDatabase);

        return newDatabase;
      } catch (err) {
        console.error('Failed to create database:', err);
        this.error = 'Не удалось создать базу данных';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateDatabase(id: string, name: string, folderId: string | null = null): Promise<CustomDatabase> {
      try {
        const updatedDatabase = await databasesApi.update(id, { name, folderId });

        const index = this.databases.findIndex(db => db.id === id);
        if (index !== -1) {
          this.databases[index] = updatedDatabase;
        }

        return updatedDatabase;
      } catch (err) {
        console.error('Failed to update database:', err);
        this.error = 'Не удалось обновить базу данных';
        throw err;
      }
    },

    async deleteDatabase(id: string): Promise<void> {
      try {
        await databasesApi.delete(id);
        this.databases = this.databases.filter(db => db.id !== id);
        // Also remove related records
        this.records = this.records.filter(r => r.databaseId !== id);
      } catch (err) {
        console.error('Failed to delete database:', err);
        this.error = 'Не удалось удалить базу данных';
        throw err;
      }
    },

    // Records
    async loadRecords(databaseId: string): Promise<Record[]> {
      try {
        this.loading = true;
        this.error = null;
        const dbRecords = await databasesApi.getRecords(databaseId);

        // Replace records for this database
        this.records = [
          ...this.records.filter(r => r.databaseId !== databaseId),
          ...dbRecords,
        ];

        return dbRecords;
      } catch (err) {
        console.error('Failed to load records:', err);
        this.error = 'Не удалось загрузить записи';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async createRecord(databaseId: string, data: RecordData): Promise<Record> {
      try {
        const newRecord = await databasesApi.createRecord(databaseId, { data });
        this.records.push(newRecord);
        return newRecord;
      } catch (err) {
        console.error('Failed to create record:', err);
        this.error = 'Не удалось создать запись';
        throw err;
      }
    },

    async updateRecord(databaseId: string, recordId: string, data: RecordData): Promise<Record> {
      try {
        const updatedRecord = await databasesApi.updateRecord(databaseId, recordId, { data });

        const index = this.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
          this.records[index] = updatedRecord;
        }

        return updatedRecord;
      } catch (err) {
        console.error('Failed to update record:', err);
        this.error = 'Не удалось обновить запись';
        throw err;
      }
    },

    async deleteRecord(databaseId: string, recordId: string): Promise<void> {
      try {
        await databasesApi.deleteRecord(databaseId, recordId);
        this.records = this.records.filter(r => r.id !== recordId);
      } catch (err) {
        console.error('Failed to delete record:', err);
        this.error = 'Не удалось удалить запись';
        throw err;
      }
    },

    // Columns
    async addColumn(databaseId: string, columnData: { name: string; type: ColumnType; position: number; options?: any }): Promise<Column> {
      try {
        const column = await databasesApi.addColumn(databaseId, columnData);

        const database = this.getDatabaseById(databaseId);
        if (database) {
          database.columns.push(column);
        }

        return column;
      } catch (err) {
        console.error('Failed to add column:', err);
        this.error = 'Не удалось добавить колонку';
        throw err;
      }
    },

    async updateColumn(databaseId: string, columnId: string, updates: Partial<UpdateColumnRequest>): Promise<Column> {
      try {
        // Получаем текущую колонку для заполнения обязательных полей
        let database = this.getDatabaseById(databaseId);
        const currentColumn = database?.columns.find(c => c.id === columnId);

        if (!currentColumn) {
          throw new Error('Column not found');
        }

        const request: UpdateColumnRequest = {
          name: updates.name ?? currentColumn.name,
          type: updates.type ?? currentColumn.type,
          position: updates.position ?? currentColumn.position,
          options: updates.options ?? currentColumn.options,
        };

        const updatedColumn = await databasesApi.updateColumn(databaseId, columnId, request);

        database = this.getDatabaseById(databaseId);
        if (database) {
          const colIndex = database.columns.findIndex(c => c.id === columnId);
          if (colIndex !== -1) {
            database.columns[colIndex] = updatedColumn;
          }
        }

        return updatedColumn;
      } catch (err) {
        console.error('Failed to update column:', err);
        this.error = 'Не удалось обновить колонку';
        throw err;
      }
    },

    async deleteColumn(databaseId: string, columnId: string): Promise<void> {
      try {
        await databasesApi.deleteColumn(databaseId, columnId);

        const database = this.getDatabaseById(databaseId);
        if (database) {
          database.columns = database.columns.filter(c => c.id !== columnId);
        }
      } catch (err) {
        console.error('Failed to delete column:', err);
        this.error = 'Не удалось удалить колонку';
        throw err;
      }
    },

    // Views
    async createView(databaseId: string, view: Partial<DatabaseView>): Promise<DatabaseView> {
      try {
        const database = this.getDatabaseById(databaseId);
        if (!database) throw new Error('Database not found');

        const newView: DatabaseView = {
          id: `view-${Date.now()}`,
          name: view.name || 'New View',
          type: view.type || 'table',
          filter: view.filter,
          sort: view.sort,
          visibleColumns: view.visibleColumns || database.columns.map(c => c.id),
          kanban: view.kanban,
        };

        if (!database.views) database.views = [];
        database.views.push(newView);

        // Save to localStorage
        const storageKey = `database-views-${databaseId}`;
        localStorage.setItem(storageKey, JSON.stringify(database.views));

        return newView;
      } catch (err) {
        console.error('Failed to create view:', err);
        this.error = 'Не удалось создать вид';
        throw err;
      }
    },

    async updateView(databaseId: string, viewId: string, updates: Partial<DatabaseView>): Promise<DatabaseView> {
      try {
        const database = this.getDatabaseById(databaseId);
        if (!database || !database.views) throw new Error('Database or views not found');

        const viewIndex = database.views.findIndex(v => v.id === viewId);
        if (viewIndex === -1) throw new Error('View not found');

        database.views[viewIndex] = { ...database.views[viewIndex], ...updates };

        // Save to localStorage
        const storageKey = `database-views-${databaseId}`;
        localStorage.setItem(storageKey, JSON.stringify(database.views));

        return database.views[viewIndex];
      } catch (err) {
        console.error('Failed to update view:', err);
        this.error = 'Не удалось обновить вид';
        throw err;
      }
    },

    async deleteView(databaseId: string, viewId: string): Promise<void> {
      try {
        const database = this.getDatabaseById(databaseId);
        if (!database || !database.views) throw new Error('Database or views not found');

        database.views = database.views.filter(v => v.id !== viewId);

        // Save to localStorage
        const storageKey = `database-views-${databaseId}`;
        localStorage.setItem(storageKey, JSON.stringify(database.views));
      } catch (err) {
        console.error('Failed to delete view:', err);
        this.error = 'Не удалось удалить вид';
        throw err;
      }
    },
  },
});
