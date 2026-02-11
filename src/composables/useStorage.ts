import { ref, watch } from 'vue';
import type { Folder, Note } from '../types';

const FOLDERS_KEY = 'notebox_folders';
const NOTES_KEY = 'notebox_notes';

export function useStorage() {
  const folders = ref<Folder[]>([]);
  const notes = ref<Note[]>([]);

  const loadFromStorage = () => {
    try {
      const storedFolders = localStorage.getItem(FOLDERS_KEY);
      const storedNotes = localStorage.getItem(NOTES_KEY);

      if (storedFolders) {
        folders.value = JSON.parse(storedFolders);
      }
      if (storedNotes) {
        notes.value = JSON.parse(storedNotes);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  };

  const saveFolders = () => {
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders.value));
    } catch (error) {
      console.error('Failed to save folders to localStorage:', error);
    }
  };

  const saveNotes = () => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes.value));
    } catch (error) {
      console.error('Failed to save notes to localStorage:', error);
    }
  };

  watch(folders, saveFolders, { deep: true });
  watch(notes, saveNotes, { deep: true });

  loadFromStorage();

  return {
    folders,
    notes,
  };
}
