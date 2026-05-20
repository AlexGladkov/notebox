import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';

export const createBasicBlockCommands = (getSlashQuery: () => string): SlashCommand[] => [
  {
    id: 'h1',
    title: 'Заголовок 1',
    description: 'Большой заголовок раздела',
    icon: 'H1',
    category: 'Базовые блоки',
    keywords: ['heading', 'h1', 'заголовок'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setHeading({ level: 1 })
        .run();
    },
  },
  {
    id: 'h2',
    title: 'Заголовок 2',
    description: 'Средний заголовок',
    icon: 'H2',
    category: 'Базовые блоки',
    keywords: ['heading', 'h2', 'заголовок'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setHeading({ level: 2 })
        .run();
    },
  },
  {
    id: 'h3',
    title: 'Заголовок 3',
    description: 'Маленький заголовок',
    icon: 'H3',
    category: 'Базовые блоки',
    keywords: ['heading', 'h3', 'заголовок'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .setHeading({ level: 3 })
        .run();
    },
  },
];
