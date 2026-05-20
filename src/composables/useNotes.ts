import { computed, ref, type Ref, type ComputedRef } from 'vue';
import type { Note } from '../types';
import type { UseNotesReturn } from '../types/composables';
import { getErrorMessage } from '../types/composables';
import { offlineStore } from '../services/offline/offlineStore';
import { indexedDbService } from '../services/offline/indexedDb';
import { notesApi } from '../api';

export function useNotes(notes: Ref<Note[]>): UseNotesReturn {
  const loading = ref(false);
  const error = ref<string | null>(null);
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

  const createNote = async (title: string, parentId?: string | null): Promise<Note> => {
    loading.value = true;
    error.value = null;
    try {
      // Используем offlineStore, который автоматически управляет синхронизацией
      const newNote = await offlineStore.createNote({
        title,
        content: '',
        parentId,
      });
      notes.value.push(newNote);
      return newNote;
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось создать заметку: ${message}`;
      console.error('Failed to create note:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> => {
    const note = notes.value.find(n => n.id === id);
    if (!note) {
      throw new Error('Note not found');
    }

    loading.value = true;
    error.value = null;
    try {
      // Используем offlineStore для обновления
      const updatedNote = await offlineStore.updateNote(id, {
        title: updates.title ?? note.title,
        content: updates.content ?? note.content,
        parentId: updates.parentId !== undefined ? updates.parentId : note.parentId,
        icon: updates.icon !== undefined ? updates.icon : note.icon,
        backdropType: updates.backdropType !== undefined ? updates.backdropType : note.backdropType,
        backdropValue: updates.backdropValue !== undefined ? updates.backdropValue : note.backdropValue,
        backdropPositionY: updates.backdropPositionY !== undefined ? updates.backdropPositionY : (note.backdropPositionY ?? 50),
      });

      const index = notes.value.findIndex(n => n.id === id);
      if (index !== -1) {
        notes.value[index] = updatedNote;
      }
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось обновить заметку: ${message}`;
      console.error('Failed to update note:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteNote = async (id: string, cascadeDelete: boolean = true): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      if (cascadeDelete) {
        // Получаем всех потомков для удаления из UI
        const descendants = getAllDescendants(id);
        const idsToRemove = new Set([id, ...descendants.map(n => n.id)]);

        // Удаляем только главную заметку через offlineStore (с cascadeDelete в syncQueue)
        // Сервер автоматически удалит потомков при синхронизации
        await offlineStore.deleteNote(id);

        // Удаляем потомков только из локального IndexedDB (не добавляя в syncQueue)
        for (const descendant of descendants) {
          await indexedDbService.deleteNote(descendant.id);
        }

        notes.value = notes.value.filter(n => !idsToRemove.has(n.id));
      } else {
        // Удалить только саму заметку
        await offlineStore.deleteNote(id);
        notes.value = notes.value.filter(n => n.id !== id);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось удалить заметку: ${message}`;
      console.error('Failed to delete note:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getNoteById = (id: string): Note | undefined => {
    return notes.value.find(n => n.id === id);
  };

  const getRootNotes = (): ComputedRef<Note[]> => {
    return computed(() =>
      notes.value
        .filter(n => !n.parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  };

  const getChildren = (parentId: string): ComputedRef<Note[]> => {
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
    loading.value = true;
    error.value = null;
    try {
      return await notesApi.getPath(noteId);
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось получить путь заметки: ${message}`;
      console.error('Failed to get note path:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const moveNote = async (noteId: string, targetParentId: string | null): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      // Используем offlineStore для перемещения
      const updatedNote = await offlineStore.moveNote(noteId, targetParentId);
      const index = notes.value.findIndex(n => n.id === noteId);
      if (index !== -1) {
        notes.value[index] = updatedNote;
      }
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось переместить заметку: ${message}`;
      console.error('Failed to move note:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleNoteExpanded = (noteId: string): void => {
    if (expandedNotes.value.has(noteId)) {
      expandedNotes.value.delete(noteId);
    } else {
      expandedNotes.value.add(noteId);
    }
    saveExpandedState();
  };

  const expandNote = (noteId: string): void => {
    expandedNotes.value.add(noteId);
    saveExpandedState();
  };

  const collapseNote = (noteId: string): void => {
    expandedNotes.value.delete(noteId);
    saveExpandedState();
  };

  const expandAllAncestors = (noteId: string): void => {
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
    loading,
    error,
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
