import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';

export const createFormattingCommands = (getSlashQuery: () => string): SlashCommand[] => [
  {
    id: 'blockquote',
    title: 'Цитата',
    description: 'Добавить цитату',
    icon: '❝',
    category: 'Форматирование',
    keywords: ['quote', 'blockquote', 'цитата'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .toggleBlockquote()
        .run();
    },
  },
  {
    id: 'code-block',
    title: 'Блок кода',
    description: 'Добавить блок кода',
    icon: '</>',
    category: 'Форматирование',
    keywords: ['code', 'codeblock', 'код'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .toggleCodeBlock()
        .run();
    },
  },
  {
    id: 'divider',
    title: 'Разделитель',
    description: 'Добавить горизонтальную линию',
    icon: '—',
    category: 'Форматирование',
    keywords: ['divider', 'hr', 'separator', 'разделитель'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setHorizontalRule()
        .run();
    },
  },
];
