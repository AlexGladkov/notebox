import { ref } from 'vue';
import { templates } from '../data/templates';
// import { aiApi } from '../api/ai';
import type { Template, TemplateCategory } from '../types/template';

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

  const replacePlaceholders = (content: string): string => {
    const currentDate = new Date().toLocaleDateString('ru-RU');
    return content.replace(/\{\{DATE\}\}/g, currentDate);
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
      return replacePlaceholders(template.content);
    }

    try {
      loading.value = true;
      error.value = null;

      // TODO: Реализовать generateTemplateContent в aiApi
      // const aiContent = await aiApi.generateTemplateContent(templateId);
      // if (aiContent) {
      //   return replacePlaceholders(aiContent);
      // }

      return replacePlaceholders(template.staticExample || template.content);
    } catch (e) {
      console.error('Failed to generate AI content:', e);
      error.value = 'Не удалось сгенерировать контент с помощью AI';
      return replacePlaceholders(template.staticExample || template.content);
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
