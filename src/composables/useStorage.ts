import { ref, watch } from 'vue';
import type { Folder, Note } from '../types';
import { markdownToBlocks } from '../utils/markdownToBlocks';

const FOLDERS_KEY = 'notebox_folders';
const NOTES_KEY = 'notebox_notes';

export function useStorage() {
  const folders = ref<Folder[]>([]);
  const notes = ref<Note[]>([]);

  const migrateNoteToBlockFormat = (note: Note): Note => {
    if (note.isBlockFormat) {
      return note;
    }

    try {
      const blocksJson = markdownToBlocks(note.content);
      return {
        ...note,
        content: blocksJson,
        isBlockFormat: true,
      };
    } catch (error) {
      console.error('Failed to migrate note to block format:', error);
      return note;
    }
  };

  const loadFromStorage = () => {
    try {
      const storedFolders = localStorage.getItem(FOLDERS_KEY);
      const storedNotes = localStorage.getItem(NOTES_KEY);

      if (storedFolders) {
        folders.value = JSON.parse(storedFolders);
      }
      if (storedNotes) {
        const parsedNotes = JSON.parse(storedNotes) as Note[];
        notes.value = parsedNotes.map(migrateNoteToBlockFormat);
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
