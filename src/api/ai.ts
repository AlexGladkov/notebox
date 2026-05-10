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
    try {
      const response = await apiClient.post<AIResponse>('/api/ai/summarize', {
        text,
      });
      return response.result;
    } catch (error) {
      console.error('AI summarize error:', error);
      // Mock implementation - возвращает заглушку если бэкенд не настроен
      return `📝 Краткое содержание:\n\n${text.slice(0, 100)}...`;
    }
  },

  /**
   * Расширить текст с помощью AI
   */
  async expand(text: string): Promise<string> {
    try {
      const response = await apiClient.post<AIResponse>('/api/ai/expand', {
        text,
      });
      return response.result;
    } catch (error) {
      console.error('AI expand error:', error);
      // Mock implementation - возвращает заглушку если бэкенд не настроен
      return `${text}\n\n✨ Расширенная версия:\n\nЭто расширенная версия текста. API для AI еще не настроен.`;
    }
  },

  /**
   * OCR - распознавание текста с изображения
   */
  async ocr(imageBase64: string): Promise<string> {
    try {
      const response = await apiClient.post<AIResponse>('/api/ai/ocr', {
        imageBase64,
      });
      return response.result;
    } catch (error) {
      console.error('AI OCR error:', error);
      // Mock implementation - возвращает заглушку если бэкенд не настроен
      return 'Распознанный текст:\n\nПример распознанного текста с изображения.\nAPI для OCR еще не настроен.\n\nЗдесь будет отображаться реальный текст после настройки бэкенда.';
    }
  },

  /**
   * Найти семантически похожие заметки
   */
  async findRelatedNotes(text: string, noteIds: string[]): Promise<RelatedNote[]> {
    try {
      const response = await apiClient.post<FindRelatedNotesResponse>('/api/ai/find-related', {
        text,
        noteIds,
      });
      return response.relatedNotes;
    } catch (error) {
      console.error('AI findRelatedNotes error:', error);
      // Mock implementation - возвращает пустой массив если бэкенд не настроен
      // В production это будет семантический поиск с использованием embeddings
      return [];
    }
  },
};
