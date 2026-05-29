import { ref } from 'vue';
import { aiApi } from '../api/ai';
import { useToast } from './useToast';

const MAX_TEXT_LENGTH = 10000;

export function useAI() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { showError } = useToast();

  const summarize = async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      error.value = 'Выделите текст для суммаризации';
      return null;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      error.value = `Текст слишком длинный (максимум ${MAX_TEXT_LENGTH} символов)`;
      return null;
    }

    try {
      loading.value = true;
      error.value = null;
      const result = await aiApi.summarize(text);
      return result;
    } catch (err) {
      error.value = 'AI временно недоступен';
      console.error('Summarize error:', err);
      showError('AI временно недоступен');
      return null;
    } finally {
      loading.value = false;
    }
  };

  const expand = async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      error.value = 'Выделите текст для расширения';
      return null;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      error.value = `Текст слишком длинный (максимум ${MAX_TEXT_LENGTH} символов)`;
      return null;
    }

    try {
      loading.value = true;
      error.value = null;
      const result = await aiApi.expand(text);
      return result;
    } catch (err) {
      error.value = 'AI временно недоступен';
      console.error('Expand error:', err);
      showError('AI временно недоступен');
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    summarize,
    expand,
  };
}
