import { ref, onMounted } from 'vue';
import type { Folder, Note } from '../types';
import { foldersApi, notesApi, ApiError } from '../api';

export function useStorage() {
  const folders = ref<Folder[]>([]);
  const notes = ref<Note[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadFolders = async () => {
    try {
      loading.value = true;
      error.value = null;
      folders.value = await foldersApi.getAll();
    } catch (err) {
      console.error('Failed to load folders:', err);
      error.value = err instanceof ApiError ? err.message : 'Failed to load folders';
      folders.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadNotes = async () => {
    try {
      loading.value = true;
      error.value = null;
      notes.value = await notesApi.getAll();
    } catch (err) {
      console.error('Failed to load notes:', err);
      error.value = err instanceof ApiError ? err.message : 'Failed to load notes';
      notes.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadFromStorage = async () => {
    await Promise.all([loadFolders(), loadNotes()]);
  };

  onMounted(() => {
    loadFromStorage();
  });

  return {
    folders,
    notes,
    loading,
    error,
    loadFolders,
    loadNotes,
    loadFromStorage,
  };
}
