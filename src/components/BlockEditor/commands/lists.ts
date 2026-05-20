import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';

export const createListCommands = (getSlashQuery: () => string): SlashCommand[] => [
  {
    id: 'bullet-list',
    title: 'Маркированный список',
    description: 'Создать простой список',
    icon: '•',
    category: 'Списки',
    keywords: ['list', 'bullet', 'список'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .toggleBulletList()
        .run();
    },
  },
  {
    id: 'numbered-list',
    title: 'Нумерованный список',
    description: 'Создать нумерованный список',
    icon: '1.',
    category: 'Списки',
    keywords: ['list', 'numbered', 'ordered', 'список'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .toggleOrderedList()
        .run();
    },
  },
  {
    id: 'todo-list',
    title: 'Список задач',
    description: 'Создать чекбокс список',
    icon: '☑',
    category: 'Списки',
    keywords: ['todo', 'checkbox', 'task', 'задачи'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .toggleTaskList()
        .run();
    },
  },
];
