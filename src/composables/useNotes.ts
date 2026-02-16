import { computed, type Ref } from 'vue';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';

export function useNotes(notes: Ref<Note[]>) {
  const createNote = async (title: string, folderId: string) => {
    try {
      const newNote = await notesApi.create({
        title,
        content: '',
        folderId,
      });
      notes.value.push(newNote);
      return newNote;
    } catch (err) {
      console.error('Failed to create note:', err);
      throw err;
    }
  };

  const updateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    const note = notes.value.find(n => n.id === id);
    if (!note) {
      throw new Error('Note not found');
    }

    try {
      const updatedNote = await notesApi.update(id, {
        title: updates.title ?? note.title,
        content: updates.content ?? note.content,
        folderId: updates.folderId ?? note.folderId,
        icon: updates.icon !== undefined ? updates.icon : note.icon,
        backdropType: updates.backdropType !== undefined ? updates.backdropType : note.backdropType,
        backdropValue: updates.backdropValue !== undefined ? updates.backdropValue : note.backdropValue,
        backdropPositionY: updates.backdropPositionY ?? note.backdropPositionY ?? 50,
      });

      const index = notes.value.findIndex(n => n.id === id);
      if (index !== -1) {
        notes.value[index] = updatedNote;
      }
    } catch (err) {
      console.error('Failed to update note:', err);
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await notesApi.delete(id);
      notes.value = notes.value.filter(n => n.id !== id);
    } catch (err) {
      console.error('Failed to delete note:', err);
      throw err;
    }
  };

  const deleteNotesByFolderIds = (folderIds: string[]) => {
    // Notes are deleted on the server via cascade delete when folders are deleted
    // Just clean up local state
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
