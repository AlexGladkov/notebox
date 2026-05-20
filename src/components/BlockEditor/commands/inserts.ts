import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';
import type { Ref } from 'vue';

interface InsertCommandsOptions {
  createDatabase: (name: string, noteId: string | null) => Promise<{ id: string }>;
  openNestedNoteModal: () => void;
  openTemplateGallery: () => void;
  openReminderModal: () => void;
  noteId: Ref<string | undefined>;
}

export const createInsertCommands = (
  getSlashQuery: () => string,
  options: InsertCommandsOptions
): SlashCommand[] => [
  {
    id: 'template',
    title: 'Шаблон',
    description: 'Создать заметку из шаблона',
    icon: '📑',
    category: 'Вставки',
    keywords: ['template', 'шаблон', 'образец'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .run();
      options.openTemplateGallery();
    },
  },
  {
    id: 'nested',
    title: 'Вложенная заметка',
    description: 'Создать дочернюю заметку',
    icon: '📄',
    category: 'Вставки',
    keywords: ['nested', 'child', 'subpage', 'вложенная', 'дочерняя'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .run();
      options.openNestedNoteModal();
    },
  },
  {
    id: 'database',
    title: 'База данных',
    description: 'Встроить табличную базу данных',
    icon: '📊',
    category: 'Вставки',
    keywords: ['database', 'table', 'data', 'база', 'таблица', 'данные'],
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

      try {
        const newDatabase = await options.createDatabase(
          'Новая база данных',
          options.noteId.value || null
        );
        editor.chain().focus().setDatabase({ databaseId: newDatabase.id }).run();
      } catch (error) {
        console.error('Failed to create database:', error);
      }
    },
  },
  {
    id: 'remind',
    title: 'Напоминание',
    description: 'Добавить напоминание к заметке',
    icon: '🔔',
    category: 'Действия',
    keywords: ['remind', 'reminder', 'напоминание', 'deadline', 'дедлайн'],
    command: (editor: Editor) => {
      const query = getSlashQuery();
      editor
        .chain()
        .focus()
        .deleteRange({
          from: editor.state.selection.from - query.length - 1,
          to: editor.state.selection.to,
        })
        .run();
      options.openReminderModal();
    },
  },
];
