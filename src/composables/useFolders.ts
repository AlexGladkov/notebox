import { computed, ref, type Ref, type ComputedRef } from 'vue';
import type { Folder } from '../types';
import type { UseFoldersReturn } from '../types/composables';
import { getErrorMessage } from '../types/composables';
import { foldersApi } from '../api';

export function useFolders(folders: Ref<Folder[]>): UseFoldersReturn {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const createFolder = async (name: string, parentId: string | null = null): Promise<Folder> => {
    loading.value = true;
    error.value = null;
    try {
      const newFolder = await foldersApi.create({ name, parentId });
      folders.value.push(newFolder);
      return newFolder;
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось создать папку: ${message}`;
      console.error('Failed to create folder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateFolder = async (id: string, name: string): Promise<void> => {
    const folder = folders.value.find(f => f.id === id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    loading.value = true;
    error.value = null;
    try {
      const updatedFolder = await foldersApi.update(id, { name, parentId: folder.parentId });
      const index = folders.value.findIndex(f => f.id === id);
      if (index !== -1) {
        folders.value[index] = updatedFolder;
      }
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось обновить папку: ${message}`;
      console.error('Failed to update folder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteFolder = async (id: string): Promise<string[]> => {
    loading.value = true;
    error.value = null;
    try {
      await foldersApi.delete(id);

      // Remove folder and its descendants from local state
      const getAllDescendantIds = (folderId: string): string[] => {
        const children = folders.value.filter(f => f.parentId === folderId);
        const descendants = [folderId];
        children.forEach(child => {
          descendants.push(...getAllDescendantIds(child.id));
        });
        return descendants;
      };

      const idsToDelete = getAllDescendantIds(id);
      folders.value = folders.value.filter(f => !idsToDelete.includes(f.id));
      return idsToDelete;
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось удалить папку: ${message}`;
      console.error('Failed to delete folder:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getFolderById = (id: string): Folder | undefined => {
    return folders.value.find(f => f.id === id);
  };

  const getChildFolders = (parentId: string | null): ComputedRef<Folder[]> => {
    return computed(() =>
      folders.value.filter(f => f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const getRootFolders = computed(() =>
    folders.value.filter(f => f.parentId === null)
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  return {
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderById,
    getChildFolders,
    getRootFolders,
  };
}
