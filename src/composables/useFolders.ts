import { computed, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import type { Note } from '../types';
import type { UseFoldersReturn } from '../types/composables';
import { useNotesStore } from '../stores/notesStore';

export function useFolders(): UseFoldersReturn {
  const store = useNotesStore();
  const { loading, error } = storeToRefs(store);

  // Папки теперь реализованы как заметки (Note), поэтому folders = notes
  const folders = computed(() => store.notes);

  const createFolder = async (name: string, parentId: string | null = null): Promise<Note> => {
    // Создаём заметку, которая будет папкой (просто заметка с пустым content)
    return store.createNote({ title: name, content: '', parentId });
  };

  const updateFolder = async (id: string, name: string): Promise<void> => {
    const folder = store.getNoteById(id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    await store.updateNote(id, { title: name });
  };

  const deleteFolder = async (id: string): Promise<string[]> => {
    // Получаем всех потомков для возврата их IDs
    const descendants = store.getAllDescendants(id);
    const idsToDelete = [id, ...descendants.map(d => d.id)];

    // Удаляем папку (и всех потомков через cascade)
    await store.deleteNote(id, true);

    return idsToDelete;
  };

  const getFolderById = (id: string): Note | undefined => {
    return store.getNoteById(id);
  };

  const getChildFolders = (parentId: string | null): ComputedRef<Note[]> => {
    return computed(() =>
      store.notes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  };

  const getRootFolders = computed(() =>
    store.notes
      .filter(n => !n.parentId)
      .sort((a, b) => a.title.localeCompare(b.title))
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
