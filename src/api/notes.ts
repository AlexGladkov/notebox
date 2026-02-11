import { apiClient } from './client';
import type { Note } from '../types';

export interface CreateNoteRequest {
  title: string;
  content: string;
  folderId: string;
}

export interface UpdateNoteRequest {
  title: string;
  content: string;
  folderId: string;
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

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/notes/${id}`);
  },
};
