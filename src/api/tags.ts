import { apiClient } from './client';
import type { Tag } from '../types';

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface SetNoteTagsRequest {
  tagIds: string[];
}

export const tagsApi = {
  async getAll(): Promise<Tag[]> {
    return apiClient.get<Tag[]>('/api/tags');
  },

  async getById(id: string): Promise<Tag> {
    return apiClient.get<Tag>(`/api/tags/${id}`);
  },

  async create(request: CreateTagRequest): Promise<Tag> {
    return apiClient.post<Tag>('/api/tags', request);
  },

  async update(id: string, request: UpdateTagRequest): Promise<Tag> {
    return apiClient.put<Tag>(`/api/tags/${id}`, request);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/tags/${id}`);
  },

  async setNoteTags(noteId: string, tagIds: string[]): Promise<Tag[]> {
    return apiClient.put<Tag[]>(`/api/tags/notes/${noteId}/tags`, { tagIds });
  },

  async getNoteTags(noteId: string): Promise<Tag[]> {
    return apiClient.get<Tag[]>(`/api/tags/notes/${noteId}/tags`);
  }
};
