import { apiClient } from './client';
import type { Note } from '../types';

export interface EnableShareResponse {
  shareToken: string;
}

export const shareApi = {
  async enableShare(noteId: string): Promise<EnableShareResponse> {
    return apiClient.post<EnableShareResponse>(`/api/notes/${noteId}/share`);
  },

  async disableShare(noteId: string): Promise<void> {
    return apiClient.delete(`/api/notes/${noteId}/share`);
  },

  async getPublicNote(token: string): Promise<Note> {
    return apiClient.get<Note>(`/api/public/notes/${token}`);
  },
};
