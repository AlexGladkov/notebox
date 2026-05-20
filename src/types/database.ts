import type { CellValue } from './index';

export type ViewType = 'table' | 'kanban';

export interface KanbanConfig {
  groupByColumnId: string;        // ID SELECT-колонки для группировки
  swimlaneColumnId?: string;      // Опциональный ID колонки для swimlanes
  columnOrder?: string[];         // Порядок колонок (option IDs)
  collapsedColumns?: string[];    // Свёрнутые колонки
  collapsedSwimlanes?: string[];  // Свёрнутые swimlanes
  cardFields?: string[];          // ID колонок для отображения на карточке
}

export interface DatabaseView {
  id: string;
  name: string;
  type?: ViewType;                // По умолчанию 'table' для обратной совместимости
  filter?: DatabaseFilter;
  sort?: DatabaseSort;
  visibleColumns?: string[];
  kanban?: KanbanConfig;          // Настройки для kanban view
}

export interface DatabaseFilter {
  columnId: string;
  operator: 'equals' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'gt' | 'lt' | 'gte' | 'lte';
  value?: CellValue;
}

export interface DatabaseSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export const TAG_COLOR_PALETTE = [
  { name: 'green', light: '#d1fae5', dark: '#10b981', text: '#065f46' },
  { name: 'yellow', light: '#fef3c7', dark: '#f59e0b', text: '#92400e' },
  { name: 'pink', light: '#fce7f3', dark: '#ec4899', text: '#9f1239' },
  { name: 'purple', light: '#ede9fe', dark: '#a855f7', text: '#6b21a8' },
  { name: 'blue', light: '#dbeafe', dark: '#3b82f6', text: '#1e40af' },
  { name: 'orange', light: '#fed7aa', dark: '#f97316', text: '#9a3412' },
  { name: 'red', light: '#fee2e2', dark: '#ef4444', text: '#991b1b' },
  { name: 'gray', light: '#f3f4f6', dark: '#6b7280', text: '#374151' },
];
