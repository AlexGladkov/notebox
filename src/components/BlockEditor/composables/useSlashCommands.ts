import { computed, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../../types/editor';
import {
  createBasicBlockCommands,
  createListCommands,
  createFormattingCommands,
  createCalloutCommands,
  createInsertCommands,
  createAICommands,
} from '../commands';

interface SlashCommandsOptions {
  createDatabase: (name: string, noteId: string | null) => Promise<{ id: string }>;
  openNestedNoteModal: () => void;
  openTemplateGallery: () => void;
  openReminderModal: () => void;
  handleSummarize: (editor: Editor) => Promise<void>;
  handleExpand: (editor: Editor) => Promise<void>;
  noteId: Ref<string | undefined>;
}

export function useSlashCommands(slashQuery: Ref<string>, options: SlashCommandsOptions) {
  const commands = computed<SlashCommand[]>(() => [
    ...createBasicBlockCommands(() => slashQuery.value),
    ...createListCommands(() => slashQuery.value),
    ...createFormattingCommands(() => slashQuery.value),
    ...createCalloutCommands(() => slashQuery.value),
    ...createInsertCommands(() => slashQuery.value, {
      createDatabase: options.createDatabase,
      openNestedNoteModal: options.openNestedNoteModal,
      openTemplateGallery: options.openTemplateGallery,
      openReminderModal: options.openReminderModal,
      noteId: options.noteId,
    }),
    ...createAICommands(() => slashQuery.value, {
      handleSummarize: options.handleSummarize,
      handleExpand: options.handleExpand,
    }),
  ]);

  return { commands };
}
