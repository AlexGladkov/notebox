import { computed, ref, type Ref } from 'vue';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';

export function useNotes(notes: Ref<Note[]>) {
  const expandedNotes = ref<Set<string>>(new Set());

  // Загрузка состояния сворачивания из localStorage
  const loadExpandedState = () => {
    try {
      const saved = localStorage.getItem('expandedNotes');
      if (saved) {
        expandedNotes.value = new Set(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load expanded state:', err);
    }
  };

  // Сохранение состояния сворачивания в localStorage
  const saveExpandedState = () => {
    try {
      localStorage.setItem('expandedNotes', JSON.stringify(Array.from(expandedNotes.value)));
    } catch (err) {
      console.error('Failed to save expanded state:', err);
    }
  };

  loadExpandedState();

  const createNote = async (title: string, parentId?: string | null) => {
    try {
      const newNote = await notesApi.create({
        title,
        content: '',
        parentId,
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
        parentId: updates.parentId !== undefined ? updates.parentId : note.parentId,
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

  const deleteNote = async (id: string, cascadeDelete: boolean = true) => {
    try {
      await notesApi.delete(id, cascadeDelete);

      if (cascadeDelete) {
        // Удалить заметку и всех её потомков
        const descendants = getAllDescendants(id);
        const idsToRemove = new Set([id, ...descendants.map(n => n.id)]);
        notes.value = notes.value.filter(n => !idsToRemove.has(n.id));
      } else {
        // Удалить только саму заметку
        notes.value = notes.value.filter(n => n.id !== id);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
      throw err;
    }
  };

  const getNoteById = (id: string) => {
    return notes.value.find(n => n.id === id);
  };

  const getRootNotes = () => {
    return computed(() =>
      notes.value
        .filter(n => !n.parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  };

  const getChildren = (parentId: string) => {
    return computed(() =>
      notes.value
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  };

  const getAllDescendants = (noteId: string): Note[] => {
    const result: Note[] = [];
    const queue = [noteId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = notes.value.filter(n => n.parentId === currentId);
      result.push(...children);
      queue.push(...children.map(c => c.id));
    }

    return result;
  };

  const getChildrenCount = (noteId: string): number => {
    return notes.value.filter(n => n.parentId === noteId).length;
  };

  const getNotePath = async (noteId: string): Promise<Note[]> => {
    try {
      return await notesApi.getPath(noteId);
    } catch (err) {
      console.error('Failed to get note path:', err);
      throw err;
    }
  };

  const moveNote = async (noteId: string, targetParentId: string | null) => {
    try {
      const updatedNote = await notesApi.move(noteId, { parentId: targetParentId });
      const index = notes.value.findIndex(n => n.id === noteId);
      if (index !== -1) {
        notes.value[index] = updatedNote;
      }
    } catch (err) {
      console.error('Failed to move note:', err);
      throw err;
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    if (expandedNotes.value.has(noteId)) {
      expandedNotes.value.delete(noteId);
    } else {
      expandedNotes.value.add(noteId);
    }
    saveExpandedState();
  };

  const expandNote = (noteId: string) => {
    expandedNotes.value.add(noteId);
    saveExpandedState();
  };

  const collapseNote = (noteId: string) => {
    expandedNotes.value.delete(noteId);
    saveExpandedState();
  };

  const expandAllAncestors = (noteId: string) => {
    let currentId: string | null | undefined = noteId;

    while (currentId) {
      const note = notes.value.find(n => n.id === currentId);
      if (!note) break;

      if (note.parentId) {
        expandedNotes.value.add(note.parentId);
      }

      currentId = note.parentId;
    }

    saveExpandedState();
  };

  return {
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    getRootNotes,
    getChildren,
    getAllDescendants,
    getChildrenCount,
    getNotePath,
    moveNote,
    expandedNotes,
    toggleNoteExpanded,
    expandNote,
    collapseNote,
    expandAllAncestors,
  };
}
