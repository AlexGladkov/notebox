import { computed, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../types';

export function useNotes(notes: Ref<Note[]>) {
  const createNote = (title: string, folderId: string) => {
    const now = Date.now();
    const newNote: Note = {
      id: uuidv4(),
      title,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
      folderId,
      createdAt: now,
      updatedAt: now,
      isBlockFormat: true,
    };
    notes.value.push(newNote);
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Omit<Note, 'id' | 'folderId' | 'createdAt'>>) => {
    const note = notes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      note.updatedAt = Date.now();
    }
  };

  const deleteNote = (id: string) => {
    notes.value = notes.value.filter(n => n.id !== id);
  };

  const deleteNotesByFolderIds = (folderIds: string[]) => {
    notes.value = notes.value.filter(n => !folderIds.includes(n.folderId));
  };

  const getNoteById = (id: string) => {
    return notes.value.find(n => n.id === id);
  };

  const getNotesByFolder = (folderId: string) => {
    return computed(() =>
      notes.value.filter(n => n.folderId === folderId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  return {
    createNote,
    updateNote,
    deleteNote,
    deleteNotesByFolderIds,
    getNoteById,
    getNotesByFolder,
  };
}
