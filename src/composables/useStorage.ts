import { ref, onMounted } from 'vue';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';

export function useStorage() {
  const notes = ref<Note[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

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
    await loadNotes();
  };

  onMounted(() => {
    loadFromStorage();
  });

  return {
    notes,
    loading,
    error,
    loadNotes,
    loadFromStorage,
  };
}
