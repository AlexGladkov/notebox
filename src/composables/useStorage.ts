import { storeToRefs } from 'pinia';
import { useNotesStore } from '../stores/notesStore';
import { useNetworkStatus } from './useNetworkStatus';

export function useStorage() {
  const store = useNotesStore();
  const { notes, loading, error } = storeToRefs(store);
  const { isOnline } = useNetworkStatus();

  const loadNotes = async (): Promise<void> => {
    await store.loadNotes(isOnline.value);
  };

  const loadFromStorage = async (): Promise<void> => {
    await loadNotes();
  };

  return {
    notes,
    loading,
    error,
    loadNotes,
    loadFromStorage,
  };
}
