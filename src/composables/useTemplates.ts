import { ref } from 'vue';
import { templates } from '../data/templates';
import { aiApi } from '../api/ai';
import type { Template, TemplateCategory } from '../types/template';
import type { Note } from '../types';

export function useTemplates() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getTemplates = (): Template[] => {
    return templates;
  };

  const getTemplatesByCategory = (category: TemplateCategory): Template[] => {
    return templates.filter(t => t.category === category);
  };

  const getTemplateById = (templateId: string): Template | undefined => {
    return templates.find(t => t.id === templateId);
  };

  const generateTemplateContent = async (
    templateId: string,
    useAI: boolean = false
  ): Promise<string> => {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!useAI) {
      return template.content;
    }

    try {
      loading.value = true;
      error.value = null;
      const aiContent = await aiApi.generateTemplateContent(templateId);

      if (aiContent) {
        return aiContent;
      }

      return template.staticExample || template.content;
    } catch (e) {
      console.error('Failed to generate AI content:', e);
      error.value = 'Не удалось сгенерировать контент с помощью AI';
      return template.staticExample || template.content;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    getTemplates,
    getTemplatesByCategory,
    getTemplateById,
    generateTemplateContent,
  };
}
