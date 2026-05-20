import { ref, type Ref } from 'vue';
import type { CustomDatabase } from '../../types';
import type { DatabaseView } from '../../types/database';
import { databasesApi } from '../../api/databases';
import { useLocalStorageFallback } from '../utils/useLocalStorageFallback';

export function useViewsCrud(databases: Ref<CustomDatabase[]>) {
  const error = ref<string | null>(null);

  const createView = async (databaseId: string, view: Omit<DatabaseView, 'id'>) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      let newView: DatabaseView;

      try {
        newView = await databasesApi.createView(databaseId, view);
      } catch (apiErr) {
        console.warn('Backend API not available, using localStorage fallback', apiErr);

        const viewId = `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newView = { ...view, id: viewId };

        const storageKey = `database-views-${databaseId}`;
        const fallback = useLocalStorageFallback<DatabaseView>(storageKey);
        const storedViews = fallback.load();
        storedViews.push(newView);
        fallback.save(storedViews);
      }

      if (!database.views) {
        database.views = [];
      }
      database.views = [...database.views, newView];

      return newView;
    } catch (err) {
      console.error('Failed to create view:', err);
      error.value = 'Не удалось создать вьюху';
      throw err;
    }
  };

  const updateView = async (databaseId: string, viewId: string, view: Partial<DatabaseView>) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      let updatedView: DatabaseView;

      try {
        updatedView = await databasesApi.updateView(databaseId, viewId, view);
      } catch (apiErr) {
        console.warn('Backend API not available, using localStorage fallback', apiErr);

        const storageKey = `database-views-${databaseId}`;
        const fallback = useLocalStorageFallback<DatabaseView>(storageKey);
        const storedViews = fallback.load();
        const updatedViews = fallback.updateById(storedViews, viewId, view);
        fallback.save(updatedViews);

        updatedView = updatedViews.find(v => v.id === viewId)!;
      }

      const viewIndex = database.views?.findIndex(v => v.id === viewId);
      if (viewIndex !== undefined && viewIndex !== -1 && database.views) {
        database.views = [
          ...database.views.slice(0, viewIndex),
          updatedView,
          ...database.views.slice(viewIndex + 1),
        ];
      }

      return updatedView;
    } catch (err) {
      console.error('Failed to update view:', err);
      error.value = 'Не удалось обновить вьюху';
      throw err;
    }
  };

  const deleteView = async (databaseId: string, viewId: string) => {
    try {
      const database = databases.value.find(db => db.id === databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      try {
        await databasesApi.deleteView(databaseId, viewId);
      } catch (apiErr) {
        console.warn('Backend API not available, using localStorage fallback', apiErr);

        const storageKey = `database-views-${databaseId}`;
        const fallback = useLocalStorageFallback<DatabaseView>(storageKey);
        const storedViews = fallback.load();
        const filteredViews = fallback.removeById(storedViews, viewId);
        fallback.save(filteredViews);
      }

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
    error,
    createView,
    updateView,
    deleteView,
  };
}
