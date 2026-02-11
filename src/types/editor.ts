import type { Editor } from '@tiptap/vue-3';

export type CalloutType = 'info' | 'warning' | 'error' | 'success';

export interface CalloutAttributes {
  type: CalloutType;
}

export interface BlockComment {
  id: string;
  text: string;
  createdAt: number;
}

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
  keywords?: string[];
}

export interface BlockMenuAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  divider?: boolean;
}

export const CALLOUT_TYPES: Record<CalloutType, { color: string; bgColor: string; borderColor: string; icon: string; label: string }> = {
  info: {
    color: '#1e40af',
    bgColor: '#dbeafe',
    borderColor: '#3b82f6',
    icon: 'ℹ️',
    label: 'Информация',
  },
  warning: {
    color: '#92400e',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    icon: '⚠️',
    label: 'Предупреждение',
  },
  error: {
    color: '#991b1b',
    bgColor: '#fee2e2',
    borderColor: '#ef4444',
    icon: '❌',
    label: 'Ошибка',
  },
  success: {
    color: '#166534',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    icon: '✅',
    label: 'Успех',
  },
};
