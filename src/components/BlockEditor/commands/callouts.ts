import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';

export const createCalloutCommands = (getSlashQuery: () => string): SlashCommand[] => [
  {
    id: 'callout-info',
    title: 'Информация',
    description: 'Синяя выноска с информацией',
    icon: 'ℹ️',
    category: 'Выноски',
    keywords: ['callout', 'info', 'информация'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setCallout({ type: 'info' })
        .run();
    },
  },
  {
    id: 'callout-warning',
    title: 'Предупреждение',
    description: 'Желтая выноска с предупреждением',
    icon: '⚠️',
    category: 'Выноски',
    keywords: ['callout', 'warning', 'предупреждение'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setCallout({ type: 'warning' })
        .run();
    },
  },
  {
    id: 'callout-error',
    title: 'Ошибка',
    description: 'Красная выноска с ошибкой',
    icon: '❌',
    category: 'Выноски',
    keywords: ['callout', 'error', 'ошибка'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setCallout({ type: 'error' })
        .run();
    },
  },
  {
    id: 'callout-success',
    title: 'Успех',
    description: 'Зеленая выноска с успехом',
    icon: '✅',
    category: 'Выноски',
    keywords: ['callout', 'success', 'tip', 'успех'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setCallout({ type: 'success' })
        .run();
    },
  },
];
