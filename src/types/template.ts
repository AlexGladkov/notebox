export interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  content: string;
  staticExample?: string;
}

export type TemplateCategory = 'work' | 'personal' | 'learning';

export interface TemplateWithExample extends Template {
  generatedContent?: string;
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  work: 'Работа',
  personal: 'Личное',
  learning: 'Обучение',
};
