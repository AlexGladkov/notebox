import { apiClient } from './client';
import type { Folder } from '../types';

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

export interface UpdateFolderRequest {
  name: string;
  parentId: string | null;
}

export const foldersApi = {
  async getAll(): Promise<Folder[]> {
    return apiClient.get<Folder[]>('/api/folders');
  },

  async getById(id: string): Promise<Folder> {
    return apiClient.get<Folder>(`/api/folders/${id}`);
  },

  async create(request: CreateFolderRequest): Promise<Folder> {
    return apiClient.post<Folder>('/api/folders', request);
  },

  async update(id: string, request: UpdateFolderRequest): Promise<Folder> {
    return apiClient.put<Folder>(`/api/folders/${id}`, request);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/folders/${id}`);
  },
};
