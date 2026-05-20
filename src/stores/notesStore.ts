import { defineStore } from 'pinia';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';
import { offlineStore } from '../services/offline/offlineStore';
import { indexedDbService } from '../services/offline/indexedDb';

/**
 * Удаляет дубликаты заметок по ID и title.
 * Для заметок с одинаковым title (например, "📥 Inbox") оставляет только самую свежую (по updatedAt).
 */
function deduplicateNotes(notes: Note[]): Note[] {
  const titleMap = new Map<string, Note[]>();

  // Группируем заметки по title
  notes.forEach(note => {
    const key = `${note.title}:${note.parentId || 'root'}`;
    if (!titleMap.has(key)) {
      titleMap.set(key, []);
    }
    titleMap.get(key)!.push(note);
  });

  const result: Note[] = [];

  // Для каждой группы заметок с одинаковым title + parentId
  titleMap.forEach(group => {
    if (group.length === 1) {
      // Одна заметка - добавляем как есть
      result.push(group[0]);
    } else {
      // Несколько заметок - сортируем по updatedAt и берем самую свежую
      const sorted = group.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      result.push(sorted[0]);
      console.warn(`Deduplicated ${group.length} copies of "${group[0].title}", kept the most recent`);
    }
  });

  return result;
}

export const useNotesStore = defineStore('notes', {
  state: () => ({
    notes: [] as Note[],
    loading: false,
    error: null as string | null,
    expandedNotes: new Set<string>(),
  }),

  getters: {
    getNoteById: (state) => (id: string) =>
      state.notes.find(n => n.id === id),

    getChildNotes: (state) => (parentId: string) =>
      state.notes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.title.localeCompare(b.title)),

    getChildrenCount: (state) => (noteId: string) =>
      state.notes.filter(n => n.parentId === noteId).length,
  },

  actions: {
    // Загрузка состояния сворачивания из localStorage
    loadExpandedState() {
      try {
        const saved = localStorage.getItem('expandedNotes');
        if (saved) {
          this.expandedNotes = new Set(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load expanded state:', err);
      }
    },

    // Сохранение состояния сворачивания в localStorage
    saveExpandedState() {
      try {
        localStorage.setItem('expandedNotes', JSON.stringify(Array.from(this.expandedNotes)));
      } catch (err) {
        console.error('Failed to save expanded state:', err);
      }
    },

    async loadNotes(isOnline: boolean) {
      try {
        this.loading = true;
        this.error = null;

        // Сначала загружаем из кэша для быстрого отображения
        const cachedNotes = await offlineStore.loadFromCache();
        if (cachedNotes.length > 0) {
          this.notes = cachedNotes;
          this.loading = false;
        }

        // Если онлайн, загружаем с сервера и синхронизируем
        if (isOnline) {
          try {
            const serverNotes = await notesApi.getAll();

            // Получаем все локальные заметки из IndexedDB (включая несинхронизированные)
            const allLocalNotes = await offlineStore.loadFromCache();

            // Мерджим с локальными заметками, сохраняя несинхронизированные изменения
            const serverNotesMap = new Map(serverNotes.map(n => [n.id, n]));

            const mergedNotes: Note[] = [];

            // Добавляем все заметки с сервера
            serverNotes.forEach(serverNote => {
              mergedNotes.push(serverNote);
            });

            // Добавляем локальные заметки которых нет на сервере (несинхронизированные)
            allLocalNotes.forEach(localNote => {
              if (!serverNotesMap.has(localNote.id)) {
                mergedNotes.push(localNote);
              }
            });

            // Дедупликация: удаляем дубликаты по title для специальных заметок
            const deduplicatedNotes = deduplicateNotes(mergedNotes);

            this.notes = deduplicatedNotes;
            await offlineStore.saveToCache(deduplicatedNotes);
            await indexedDbService.setMetadata('lastSyncTime', Date.now());
          } catch (err) {
            console.error('Failed to load from server:', err);
            // Загружаем актуальные данные из IndexedDB (могли быть обновлены во время загрузки)
            const freshLocalNotes = await offlineStore.loadFromCache();
            if (freshLocalNotes.length > 0) {
              this.notes = freshLocalNotes;
            } else {
              this.error = err instanceof ApiError ? err.message : 'Failed to load notes';
              this.notes = [];
            }
          }
        } else if (cachedNotes.length === 0) {
          // Офлайн и нет кэша
          this.error = 'Нет подключения к интернету и нет локального кэша';
          this.notes = [];
        }

        // Загружаем состояние раскрытых заметок
        this.loadExpandedState();
      } catch (err) {
        console.error('Failed to load notes:', err);
        this.error = err instanceof ApiError ? err.message : 'Failed to load notes';
        this.notes = [];
      } finally {
        this.loading = false;
      }
    },

    async createNote(noteData: { title: string; content?: string; parentId?: string | null; isFolder?: boolean; icon?: string | null }): Promise<Note> {
      this.loading = true;
      this.error = null;
      try {
        // Используем offlineStore, который автоматически управляет синхронизацией
        const newNote = await offlineStore.createNote({
          title: noteData.title,
          content: noteData.content || '',
          parentId: noteData.parentId,
          icon: noteData.icon,
        });
        this.notes.push(newNote);
        return newNote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Не удалось создать заметку: ${message}`;
        console.error('Failed to create note:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
      const note = this.notes.find(n => n.id === id);
      if (!note) {
        throw new Error('Note not found');
      }

      this.loading = true;
      this.error = null;
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

        const index = this.notes.findIndex(n => n.id === id);
        if (index !== -1) {
          this.notes[index] = updatedNote;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Не удалось обновить заметку: ${message}`;
        console.error('Failed to update note:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteNote(id: string, cascadeDelete: boolean = true): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        if (cascadeDelete) {
          // Получаем всех потомков для удаления из UI
          const descendants = this.getAllDescendants(id);
          const idsToRemove = new Set([id, ...descendants.map(n => n.id)]);

          // Удаляем только главную заметку через offlineStore (с cascadeDelete в syncQueue)
          // Сервер автоматически удалит потомков при синхронизации
          await offlineStore.deleteNote(id);

          // Удаляем потомков только из локального IndexedDB (не добавляя в syncQueue)
          for (const descendant of descendants) {
            await indexedDbService.deleteNote(descendant.id);
          }

          this.notes = this.notes.filter(n => !idsToRemove.has(n.id));
        } else {
          // Удалить только саму заметку
          await offlineStore.deleteNote(id);
          this.notes = this.notes.filter(n => n.id !== id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Не удалось удалить заметку: ${message}`;
        console.error('Failed to delete note:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    getAllDescendants(noteId: string): Note[] {
      const result: Note[] = [];
      const queue = [noteId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = this.notes.filter(n => n.parentId === currentId);
        result.push(...children);
        queue.push(...children.map(c => c.id));
      }

      return result;
    },

    async getNotePath(noteId: string): Promise<Note[]> {
      this.loading = true;
      this.error = null;
      try {
        return await notesApi.getPath(noteId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Не удалось получить путь заметки: ${message}`;
        console.error('Failed to get note path:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async moveNote(noteId: string, targetParentId: string | null): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        // Используем offlineStore для перемещения
        const updatedNote = await offlineStore.moveNote(noteId, targetParentId);
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
          this.notes[index] = updatedNote;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Не удалось переместить заметку: ${message}`;
        console.error('Failed to move note:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    toggleNoteExpanded(noteId: string): void {
      if (this.expandedNotes.has(noteId)) {
        this.expandedNotes.delete(noteId);
      } else {
        this.expandedNotes.add(noteId);
      }
      this.saveExpandedState();
    },

    expandNote(noteId: string): void {
      this.expandedNotes.add(noteId);
      this.saveExpandedState();
    },

    collapseNote(noteId: string): void {
      this.expandedNotes.delete(noteId);
      this.saveExpandedState();
    },

    expandAllAncestors(noteId: string): void {
      let currentId: string | null | undefined = noteId;

      while (currentId) {
        const note = this.notes.find(n => n.id === currentId);
        if (!note) break;

        if (note.parentId) {
          this.expandedNotes.add(note.parentId);
        }

        currentId = note.parentId;
      }

      this.saveExpandedState();
    },
  },
});
