import { computed, type Ref } from 'vue';
import type { Folder } from '../types';
import { foldersApi, ApiError } from '../api';

export function useFolders(folders: Ref<Folder[]>) {
  const createFolder = async (name: string, parentId: string | null = null) => {
    try {
      const newFolder = await foldersApi.create({ name, parentId });
      folders.value.push(newFolder);
      return newFolder;
    } catch (err) {
      console.error('Failed to create folder:', err);
      throw err;
    }
  };

  const updateFolder = async (id: string, name: string) => {
    const folder = folders.value.find(f => f.id === id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    try {
      const updatedFolder = await foldersApi.update(id, { name, parentId: folder.parentId });
      const index = folders.value.findIndex(f => f.id === id);
      if (index !== -1) {
        folders.value[index] = updatedFolder;
      }
    } catch (err) {
      console.error('Failed to update folder:', err);
      throw err;
    }
  };

  const deleteFolder = async (id: string) => {
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
      console.error('Failed to delete folder:', err);
      throw err;
    }
  };

  const getFolderById = (id: string) => {
    return folders.value.find(f => f.id === id);
  };

  const getChildFolders = (parentId: string | null) => {
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
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderById,
    getChildFolders,
    getRootFolders,
  };
}
