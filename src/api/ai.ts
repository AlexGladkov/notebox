import { apiClient } from './client';

export interface SummarizeRequest {
  text: string;
}

export interface ExpandRequest {
  text: string;
}

export interface AIResponse {
  result: string;
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
};
