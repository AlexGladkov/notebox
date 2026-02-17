import { apiClient } from './client';
import type { Note } from '../types';

export interface CreateNoteRequest {
  title: string;
  content: string;
  folderId: string;
  parentId?: string | null;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
}

export interface UpdateNoteRequest {
  title: string;
  content: string;
  folderId: string;
  parentId?: string | null;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
}

export interface MoveNoteRequest {
  parentId: string | null;
}

export const notesApi = {
  async getAll(folderId?: string): Promise<Note[]> {
    const url = folderId ? `/api/notes?folderId=${folderId}` : '/api/notes';
    return apiClient.get<Note[]>(url);
  },

  async getById(id: string): Promise<Note> {
    return apiClient.get<Note>(`/api/notes/${id}`);
  },

  async create(request: CreateNoteRequest): Promise<Note> {
    return apiClient.post<Note>('/api/notes', request);
  },

  async update(id: string, request: UpdateNoteRequest): Promise<Note> {
    return apiClient.put<Note>(`/api/notes/${id}`, request);
  },

  async delete(id: string, cascadeDelete: boolean = true): Promise<void> {
    const action = cascadeDelete ? 'cascade' : 'orphan';
    return apiClient.delete(`/api/notes/${id}?action=${action}`);
  },

  async getChildren(parentId: string): Promise<Note[]> {
    return apiClient.get<Note[]>(`/api/notes/${parentId}/children`);
  },

  async getPath(noteId: string): Promise<Note[]> {
    return apiClient.get<Note[]>(`/api/notes/${noteId}/path`);
  },

  async move(noteId: string, request: MoveNoteRequest): Promise<Note> {
    return apiClient.put<Note>(`/api/notes/${noteId}/move`, request);
  },

  async createSubpage(parentId: string, title: string): Promise<Note> {
    return this.create({
      title,
      content: '',
      folderId: '', // Will be set from parent
      parentId,
    });
  },
};
