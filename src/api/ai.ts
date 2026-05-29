import { apiClient } from './client';
import type { RelatedNote } from '../types';

export interface SummarizeRequest {
  text: string;
}

export interface ExpandRequest {
  text: string;
}

export interface AIResponse {
  result: string;
}

export interface OCRRequest {
  imageBase64: string;
}

export interface FindRelatedNotesRequest {
  text: string;
  noteIds: string[];
}

export interface FindRelatedNotesResponse {
  relatedNotes: RelatedNote[];
}

export const aiApi = {
  /**
   * Суммаризировать текст с помощью AI
   */
  async summarize(text: string): Promise<string> {
    const response = await apiClient.post<AIResponse>('/api/ai/summarize', {
      text,
    });
    return response.result;
  },

  /**
   * Расширить текст с помощью AI
   */
  async expand(text: string): Promise<string> {
    const response = await apiClient.post<AIResponse>('/api/ai/expand', {
      text,
    });
    return response.result;
  },

  /**
   * OCR - распознавание текста с изображения
   */
  async ocr(imageBase64: string): Promise<string> {
    const response = await apiClient.post<AIResponse>('/api/ai/ocr', {
      imageBase64,
    });
    return response.result;
  },

  /**
   * Найти семантически похожие заметки
   */
  async findRelatedNotes(text: string, noteIds: string[]): Promise<RelatedNote[]> {
    const response = await apiClient.post<FindRelatedNotesResponse>('/api/ai/find-related', {
      text,
      noteIds,
    });
    return response.relatedNotes;
  },
};
