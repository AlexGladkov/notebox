import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';

interface AICommandsOptions {
  handleSummarize: (editor: Editor) => Promise<void>;
  handleExpand: (editor: Editor) => Promise<void>;
}

export const createAICommands = (
  getSlashQuery: () => string,
  options: AICommandsOptions
): SlashCommand[] => [
  {
    id: 'summarize',
    title: 'Суммаризировать',
    description: 'Создать краткое содержание текста',
    icon: '📝',
    category: 'AI действия',
    keywords: ['summarize', 'sum', 'summary', 'суммаризация', 'кратко'],
    command: async (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .run();
      await options.handleSummarize(editor);
    },
  },
  {
    id: 'expand',
    title: 'Расширить текст',
    description: 'Дополнить и расширить выбранный текст',
    icon: '✨',
    category: 'AI действия',
    keywords: ['expand', 'exp', 'elaborate', 'расширить', 'дополнить'],
    command: async (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .run();
      await options.handleExpand(editor);
    },
  },
];
