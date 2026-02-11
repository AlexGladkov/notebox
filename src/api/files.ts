import { apiClient } from './client';

export interface UploadFileResponse {
  fileId: string;
  filename: string;
  key: string;
  contentType: string | null;
  size: number;
}

export interface GetFileUrlResponse {
  url: string;
}

export const filesApi = {
  async upload(file: File): Promise<UploadFileResponse> {
    return apiClient.uploadFile('/api/files/upload', file);
  },

  async getUrl(key: string): Promise<string> {
    const response = await apiClient.get<GetFileUrlResponse>(`/api/files/${key}`);
    return response.url;
  },

  async delete(key: string): Promise<void> {
    return apiClient.delete(`/api/files/${key}`);
  },
};
