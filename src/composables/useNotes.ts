import { computed, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import type { Note } from '../types';
import type { UseNotesReturn } from '../types/composables';
import { useNotesStore } from '../stores/notesStore';

export function useNotes(): UseNotesReturn {
  const store = useNotesStore();
  const { loading, error, expandedNotes } = storeToRefs(store);

  const createNote = async (title: string, parentId?: string | null): Promise<Note> => {
    return store.createNote({ title, content: '', parentId });
  };

  const getNoteById = (id: string): Note | undefined => {
    return store.getNoteById(id);
  };

  const getRootNotes = (): ComputedRef<Note[]> => {
    return computed(() => store.rootNotes);
  };

  const getChildren = (parentId: string): ComputedRef<Note[]> => {
    return computed(() => store.getChildNotes(parentId));
  };

  const getAllDescendants = (noteId: string): Note[] => {
    return store.getAllDescendants(noteId);
  };

  const getChildrenCount = (noteId: string): number => {
    return store.getChildrenCount(noteId);
  };

  return {
    loading,
    error,
    createNote,
    updateNote: store.updateNote,
    deleteNote: store.deleteNote,
    getNoteById,
    getRootNotes,
    getChildren,
    getAllDescendants,
    getChildrenCount,
    getNotePath: store.getNotePath,
    moveNote: store.moveNote,
    expandedNotes,
    toggleNoteExpanded: store.toggleNoteExpanded,
    expandNote: store.expandNote,
    collapseNote: store.collapseNote,
    expandAllAncestors: store.expandAllAncestors,
  };
}
