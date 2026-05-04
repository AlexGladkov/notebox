import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../../types';
import type { CreateNoteRequest, UpdateNoteRequest } from '../../api/notes';
import { indexedDbService } from './indexedDb';
import { syncQueue } from './syncQueue';
import { syncService } from './syncService';
import { useNetworkStatus } from './networkStatus';

class OfflineStore {
  async loadFromCache(): Promise<Note[]> {
    try {
      await indexedDbService.init();
      const notes = await indexedDbService.getAllNotes();
      return notes;
    } catch (error) {
      console.error('Failed to load from cache:', error);
      return [];
    }
  }

  async saveToCache(notes: Note[]): Promise<void> {
    try {
      await indexedDbService.saveNotes(notes);
    } catch (error) {
      console.error('Failed to save to cache:', error);
      throw error;
    }
  }

  async syncWithServer(): Promise<void> {
    const { isOnline } = useNetworkStatus();

    if (!isOnline.value) {
      console.log('Cannot sync: offline');
      return;
    }

    try {
      await syncService.fullSync();
    } catch (error) {
      console.error('Failed to sync with server:', error);
      throw error;
    }
  }

  async createNote(request: CreateNoteRequest): Promise<Note> {
    const { isOnline } = useNetworkStatus();

    // Создаём заметку локально с клиентским UUID
    const now = Date.now();
    const newNote: Note = {
      id: uuidv4(),
      title: request.title,
      content: request.content,
      parentId: request.parentId ?? null,
      icon: request.icon ?? null,
      backdropType: request.backdropType ?? null,
      backdropValue: request.backdropValue ?? null,
      backdropPositionY: request.backdropPositionY ?? 50,
      createdAt: now,
      updatedAt: now,
      tags: [],
    };

    // Сохраняем в локальный кэш
    await indexedDbService.saveNote(newNote);

    // Добавляем в очередь синхронизации
    await syncQueue.add({
      noteId: newNote.id,
      operation: 'create',
      payload: newNote,
      timestamp: now,
    });

    // Если онлайн, сразу пытаемся синхронизировать
    if (isOnline.value) {
      syncService.processQueue().catch(error => {
        console.error('Failed to sync after create:', error);
      });
    }

    return newNote;
  }

  async updateNote(id: string, request: UpdateNoteRequest): Promise<Note> {
    const { isOnline } = useNetworkStatus();

    // Получаем текущую версию
    const currentNote = await indexedDbService.getNote(id);
    if (!currentNote) {
      throw new Error('Note not found');
    }

    // Обновляем заметку локально
    const updatedNote: Note = {
      ...currentNote,
      title: request.title,
      content: request.content,
      parentId: request.parentId ?? currentNote.parentId,
      icon: request.icon !== undefined ? request.icon : currentNote.icon,
      backdropType: request.backdropType !== undefined ? request.backdropType : currentNote.backdropType,
      backdropValue: request.backdropValue !== undefined ? request.backdropValue : currentNote.backdropValue,
      backdropPositionY: request.backdropPositionY !== undefined ? request.backdropPositionY : currentNote.backdropPositionY,
      updatedAt: Date.now(),
    };

    // Сохраняем в локальный кэш
    await indexedDbService.saveNote(updatedNote);

    // Добавляем в очередь синхронизации
    await syncQueue.add({
      noteId: id,
      operation: 'update',
      payload: updatedNote,
      timestamp: updatedNote.updatedAt,
    });

    // Если онлайн, сразу пытаемся синхронизировать
    if (isOnline.value) {
      syncService.processQueue().catch(error => {
        console.error('Failed to sync after update:', error);
      });
    }

    return updatedNote;
  }

  async deleteNote(id: string): Promise<void> {
    const { isOnline } = useNetworkStatus();

    // Удаляем из локального кэша
    await indexedDbService.deleteNote(id);

    // Добавляем в очередь синхронизации
    await syncQueue.add({
      noteId: id,
      operation: 'delete',
      payload: { id },
      timestamp: Date.now(),
    });

    // Если онлайн, сразу пытаемся синхронизировать
    if (isOnline.value) {
      syncService.processQueue().catch(error => {
        console.error('Failed to sync after delete:', error);
      });
    }
  }

  async moveNote(id: string, parentId: string | null): Promise<Note> {
    const { isOnline } = useNetworkStatus();

    // Получаем текущую версию
    const currentNote = await indexedDbService.getNote(id);
    if (!currentNote) {
      throw new Error('Note not found');
    }

    // Обновляем заметку локально
    const updatedNote: Note = {
      ...currentNote,
      parentId,
      updatedAt: Date.now(),
    };

    // Сохраняем в локальный кэш
    await indexedDbService.saveNote(updatedNote);

    // Добавляем в очередь синхронизации
    await syncQueue.add({
      noteId: id,
      operation: 'move',
      payload: { parentId },
      timestamp: updatedNote.updatedAt,
    });

    // Если онлайн, сразу пытаемся синхронизировать
    if (isOnline.value) {
      syncService.processQueue().catch(error => {
        console.error('Failed to sync after move:', error);
      });
    }

    return updatedNote;
  }

  async getNote(id: string): Promise<Note | undefined> {
    return indexedDbService.getNote(id);
  }

  async getAllNotes(): Promise<Note[]> {
    return indexedDbService.getAllNotes();
  }

  async clear(): Promise<void> {
    await indexedDbService.clear();
  }
}

export const offlineStore = new OfflineStore();
