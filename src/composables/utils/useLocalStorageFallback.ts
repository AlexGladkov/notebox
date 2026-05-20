export function useLocalStorageFallback<T extends { id: string }>(storageKey: string) {
  const load = (): T[] => {
    try {
      const storedData = localStorage.getItem(storageKey);
      const items = storedData ? JSON.parse(storedData) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Failed to parse from localStorage:', e);
      return [];
    }
  };

  const save = (items: T[]): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  const findById = (items: T[], id: string): T | undefined => {
    return items.find(item => item.id === id);
  };

  const updateById = (items: T[], id: string, update: Partial<T>): T[] => {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }

    const updatedItem = { ...items[index], ...update };
    return [
      ...items.slice(0, index),
      updatedItem,
      ...items.slice(index + 1),
    ];
  };

  const removeById = (items: T[], id: string): T[] => {
    return items.filter(item => item.id !== id);
  };

  return {
    load,
    save,
    findById,
    updateById,
    removeById,
  };
}
