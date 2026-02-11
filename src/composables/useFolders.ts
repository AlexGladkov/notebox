import { computed, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { Folder } from '../types';

export function useFolders(folders: Ref<Folder[]>) {
  const createFolder = (name: string, parentId: string | null = null) => {
    const now = Date.now();
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    folders.value.push(newFolder);
    return newFolder;
  };

  const updateFolder = (id: string, name: string) => {
    const folder = folders.value.find(f => f.id === id);
    if (folder) {
      folder.name = name;
      folder.updatedAt = Date.now();
    }
  };

  const deleteFolder = (id: string) => {
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
