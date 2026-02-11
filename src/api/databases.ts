import { apiClient } from './client';
import type { CustomDatabase, Column, Record, ColumnType, SelectOption } from '../types';

export interface CreateDatabaseRequest {
  name: string;
  folderId: string | null;
}

export interface UpdateDatabaseRequest {
  name: string;
  folderId: string | null;
}

export interface CreateColumnRequest {
  name: string;
  type: ColumnType;
  options?: SelectOption[];
  position: number;
}

export interface UpdateColumnRequest {
  name: string;
  type: ColumnType;
  options?: SelectOption[];
  position: number;
}

export interface CreateRecordRequest {
  data: { [columnId: string]: any };
}

export interface UpdateRecordRequest {
  data: { [columnId: string]: any };
}

export const databasesApi = {
  // Database operations
  async getAll(): Promise<CustomDatabase[]> {
    return apiClient.get<CustomDatabase[]>('/api/databases');
  },

  async getById(id: string): Promise<CustomDatabase> {
    return apiClient.get<CustomDatabase>(`/api/databases/${id}`);
  },

  async create(request: CreateDatabaseRequest): Promise<CustomDatabase> {
    return apiClient.post<CustomDatabase>('/api/databases', request);
  },

  async update(id: string, request: UpdateDatabaseRequest): Promise<CustomDatabase> {
    return apiClient.put<CustomDatabase>(`/api/databases/${id}`, request);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/databases/${id}`);
  },

  // Column operations
  async addColumn(databaseId: string, request: CreateColumnRequest): Promise<Column> {
    return apiClient.post<Column>(`/api/databases/${databaseId}/columns`, request);
  },

  async updateColumn(databaseId: string, columnId: string, request: UpdateColumnRequest): Promise<Column> {
    return apiClient.put<Column>(`/api/databases/${databaseId}/columns/${columnId}`, request);
  },

  async deleteColumn(databaseId: string, columnId: string): Promise<void> {
    return apiClient.delete(`/api/databases/${databaseId}/columns/${columnId}`);
  },

  // Record operations
  async getRecords(databaseId: string): Promise<Record[]> {
    return apiClient.get<Record[]>(`/api/databases/${databaseId}/records`);
  },

  async createRecord(databaseId: string, request: CreateRecordRequest): Promise<Record> {
    return apiClient.post<Record>(`/api/databases/${databaseId}/records`, request);
  },

  async updateRecord(databaseId: string, recordId: string, request: UpdateRecordRequest): Promise<Record> {
    return apiClient.put<Record>(`/api/databases/${databaseId}/records/${recordId}`, request);
  },

  async deleteRecord(databaseId: string, recordId: string): Promise<void> {
    return apiClient.delete(`/api/databases/${databaseId}/records/${recordId}`);
  },
};
