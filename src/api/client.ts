import type { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errorCode = 'UNKNOWN_ERROR';

    try {
      const errorData: ApiResponse<any> = await response.json();
      if (errorData.error) {
        errorCode = errorData.error.code;
        errorMessage = errorData.error.message;
      }
    } catch {
      // Ignore JSON parse errors
    }

    throw new ApiError(errorCode, errorMessage, response.status);
  }

  const data: ApiResponse<T> = await response.json();

  if (data.error) {
    throw new ApiError(data.error.code, data.error.message);
  }

  if (data.data === null || data.data === undefined) {
    throw new ApiError('NO_DATA', 'No data returned from server');
  }

  return data.data;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete(path: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new ApiError(
        'DELETE_ERROR',
        `Failed to delete resource: ${response.status}`,
        response.status
      );
    }
  },

  async uploadFile(path: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },
};
