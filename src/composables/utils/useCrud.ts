import { ref } from 'vue';

export interface CrudApi<T> {
  getAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface CrudOptions {
  loadErrorMessage?: string;
  createErrorMessage?: string;
  updateErrorMessage?: string;
  deleteErrorMessage?: string;
}

export function useCrud<T extends { id: string }>(
  api: CrudApi<T>,
  options: CrudOptions = {}
) {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      items.value = await api.getAll();
    } catch (err) {
      console.error('Failed to load items:', err);
      error.value = options.loadErrorMessage || 'Не удалось загрузить данные';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const create = async (data: Partial<T>): Promise<T> => {
    try {
      loading.value = true;
      error.value = null;
      const newItem = await api.create(data);
      items.value = [...items.value, newItem] as T[];
      return newItem;
    } catch (err) {
      console.error('Failed to create item:', err);
      error.value = options.createErrorMessage || 'Не удалось создать запись';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const update = async (id: string, data: Partial<T>): Promise<T> => {
    try {
      loading.value = true;
      error.value = null;
      const updatedItem = await api.update(id, data);

      const index = items.value.findIndex(item => item.id === id);
      if (index !== -1) {
        items.value = [
          ...items.value.slice(0, index),
          updatedItem,
          ...items.value.slice(index + 1),
        ] as T[];
      }

      return updatedItem;
    } catch (err) {
      console.error('Failed to update item:', err);
      error.value = options.updateErrorMessage || 'Не удалось обновить запись';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      await api.delete(id);
      items.value = items.value.filter(item => item.id !== id);
    } catch (err) {
      console.error('Failed to delete item:', err);
      error.value = options.deleteErrorMessage || 'Не удалось удалить запись';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    items,
    loading,
    error,
    load,
    create,
    update,
    remove,
  };
}
