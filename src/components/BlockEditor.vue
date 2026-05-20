<template>
  <div class="block-editor-wrapper">
    <div class="block-editor-content-wrapper" @mousemove="handleMouseMove">
      <editor-content :editor="editor" class="block-editor-content" />

      <!-- Block Handle -->
      <div
        v-if="blockHandleVisible && blockHandlePosition"
        class="block-handle"
        :style="{
          top: blockHandlePosition.top + 'px',
          left: blockHandlePosition.left + 'px',
        }"
        @click="openBlockMenu"
        @mousedown="startDrag"
        draggable="true"
        title="Перетащите для перемещения или нажмите для меню"
      >
        ⋮⋮
      </div>
    </div>

    <EditorBubbleMenu v-if="editor" :editor="editor" />

    <SlashCommandMenu
      v-if="editor"
      ref="slashMenuRef"
      :editor="editor"
      :visible="slashMenuVisible"
      :query="slashQuery"
      :commands="slashCommands"
      @command-selected="handleSlashCommand"
    />

    <WikiLinkSuggestion
      v-if="editor"
      ref="wikiLinkMenuRef"
      :visible="wikiLinkMenuVisible"
      :query="wikiLinkQuery"
      :notes="props.allNotes || []"
      :range="wikiLinkRange"
      @select-note="handleWikiLinkSelect"
      @create-note="handleWikiLinkCreate"
    />

    <BlockMenu
      v-if="blockMenuVisible"
      :visible="blockMenuVisible"
      :actions="blockMenuActions"
      :position="blockMenuPosition"
      @close="blockMenuVisible = false"
    />

    <CreateNestedNoteModal
      :visible="nestedNoteModalVisible"
      :loading="nestedNoteLoading"
      @create="handleCreateNestedNote"
      @close="nestedNoteModalVisible = false"
    />

    <TemplateGalleryModal
      v-model="templateGalleryVisible"
      @create="handleCreateFromTemplate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, toRef } from 'vue';
import { useEditor, EditorContent, type Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import { Callout } from '../extensions/CalloutExtension';
import { SlashCommand } from '../extensions/SlashCommand';
import { BlockComment } from '../extensions/BlockComment';
import { Database } from '../extensions/DatabaseExtension';
import { WikiLink } from '../extensions/WikiLinkExtension';

import EditorBubbleMenu from './BlockEditor/BubbleMenu.vue';
import SlashCommandMenu from './BlockEditor/SlashCommandMenu.vue';
import BlockMenu from './BlockEditor/BlockMenu.vue';
import CreateNestedNoteModal from './BlockEditor/CreateNestedNoteModal.vue';
import TemplateGalleryModal from './TemplateGallery/TemplateGalleryModal.vue';
import WikiLinkSuggestion from './BlockEditor/WikiLinkSuggestion.vue';

import type { Note } from '../types';
import { notesApi } from '../api/notes';
import { useDatabases } from '../composables/useDatabases';
import { useAI } from '../composables/useAI';
import { useSlashCommands } from './BlockEditor/composables/useSlashCommands';
import { useBlockOperations } from './BlockEditor/composables/useBlockOperations';
import { useWikiLinks } from './BlockEditor/composables/useWikiLinks';

const props = defineProps<{
  modelValue: string;
  noteId?: string;
  allNotes?: Note[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'noteCreated': [noteId: string];
  'requestSave': [];
  'navigate-to-note': [noteId: string];
  'createFromTemplate': [data: { title: string; content: string; icon: string }];
  'openReminderModal': [];
}>();

const slashMenuVisible = ref(false);
const slashQuery = ref('');
const slashMenuRef = ref<InstanceType<typeof SlashCommandMenu> | null>(null);
const nestedNoteModalVisible = ref(false);
const nestedNoteLoading = ref(false);
const templateGalleryVisible = ref(false);
const wikiLinkMenuRef = ref<InstanceType<typeof WikiLinkSuggestion> | null>(null);

// Database composable for creating databases
const { createDatabase } = useDatabases();

// AI composable for AI operations
const { loading: _aiLoading, error: aiError, summarize, expand } = useAI();

// AI command handlers
const handleSummarize = async (editor: Editor) => {
  const { state } = editor;
  const { from, to } = state.selection;

  // Get selected text or entire document
  let textToSummarize = '';
  if (from !== to) {
    // User has selected text
    textToSummarize = state.doc.textBetween(from, to, ' ');
  } else {
    // No selection - use entire document
    textToSummarize = state.doc.textContent;
  }

  if (!textToSummarize.trim()) {
    console.warn('No text to summarize');
    return;
  }

  const result = await summarize(textToSummarize);

  if (result) {
    // Replace selection or insert at cursor
    if (from !== to) {
      editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
    } else {
      editor.chain().focus().insertContent(result).run();
    }
  } else if (aiError.value) {
    console.error('AI summarize error:', aiError.value);
  }
};

const handleExpand = async (editor: Editor) => {
  const { state } = editor;
  const { from, to } = state.selection;

  // Get selected text or current paragraph
  let textToExpand = '';
  if (from !== to) {
    // User has selected text
    textToExpand = state.doc.textBetween(from, to, ' ');
  } else {
    // No selection - try to get current paragraph/block
    const $pos = state.doc.resolve(from);
    const start = $pos.start($pos.depth);
    const end = $pos.end($pos.depth);
    textToExpand = state.doc.textBetween(start, end, ' ');
  }

  if (!textToExpand.trim()) {
    console.warn('No text to expand');
    return;
  }

  const result = await expand(textToExpand);

  if (result) {
    // Replace selection or current paragraph
    if (from !== to) {
      editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
    } else {
      const $pos = state.doc.resolve(from);
      const start = $pos.start($pos.depth);
      const end = $pos.end($pos.depth);
      editor.chain().focus().deleteRange({ from: start, to: end }).insertContent(result).run();
    }
  } else if (aiError.value) {
    console.error('AI expand error:', aiError.value);
  }
};

// Use slash commands composable
const { commands: slashCommands } = useSlashCommands(slashQuery, {
  createDatabase: (name: string, noteId: string | null) => createDatabase(name, noteId),
  openNestedNoteModal: () => {
    nestedNoteModalVisible.value = true;
  },
  openTemplateGallery: () => {
    templateGalleryVisible.value = true;
  },
  openReminderModal: () => {
    emit('openReminderModal');
  },
  handleSummarize,
  handleExpand,
  noteId: toRef(props, 'noteId'),
});

// Парсим начальное значение так же, как в watch
const parseInitialContent = () => {
  try {
    const value = props.modelValue;
    if (!value || !value.trim()) {
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }

    // Попробуем распарсить как JSON
    // Если это JSON, он начинается с '{' или '['
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      return JSON.parse(value);
    }

    // Иначе считаем это HTML и вернем его как есть
    // TipTap умеет обрабатывать HTML напрямую
    return value;
  } catch (error) {
    console.error('Failed to parse initial editor content:', error);
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
};

const editor = useEditor({
  content: parseInitialContent(),
  extensions: [
    StarterKit,
    Highlight,
    Underline,
    Link.configure({
      openOnClick: false,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Placeholder.configure({
      placeholder: 'Начните писать или введите "/" для команд...',
    }),
    TextStyle,
    Color,
    Callout,
    Database,
    SlashCommand.configure({
      commands: slashCommands.value,
      onShow: (query) => {
        slashMenuVisible.value = true;
        slashQuery.value = query;
      },
      onHide: () => {
        slashMenuVisible.value = false;
        slashQuery.value = '';
      },
      onNavigateUp: () => {
        slashMenuRef.value?.navigateUp();
      },
      onNavigateDown: () => {
        slashMenuRef.value?.navigateDown();
      },
      onSelectCurrent: () => {
        slashMenuRef.value?.selectCurrent();
      },
    }),
    WikiLink.configure({
      notes: props.allNotes || [],
      onShowSuggestions: (query, range) => {
        wikiLinkMenuVisible.value = true;
        wikiLinkQuery.value = query;
        wikiLinkRange.value = range;
      },
      onHideSuggestions: () => {
        wikiLinkMenuVisible.value = false;
        wikiLinkQuery.value = '';
        wikiLinkRange.value = null;
      },
      onNavigate: (noteId) => {
        emit('navigate-to-note', noteId);
      },
      onNavigateUp: () => {
        wikiLinkMenuRef.value?.navigateUp();
      },
      onNavigateDown: () => {
        wikiLinkMenuRef.value?.navigateDown();
      },
      onSelectCurrent: () => {
        wikiLinkMenuRef.value?.selectCurrent();
      },
    }),
    BlockComment,
  ],
  onUpdate: ({ editor }) => {
    const json = editor.getJSON();
    emit('update:modelValue', JSON.stringify(json));
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none dark:prose-invert',
    },
    handleClick: (view, pos, event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/notes/')) {
          event.preventDefault();
          event.stopPropagation();
          const noteId = href.replace('/notes/', '');
          if (noteId) {
            emit('navigate-to-note', noteId);
          }
          return true;
        }
      }
      return false;
    },
  },
});

const handleSlashCommand = () => {
  slashMenuVisible.value = false;
  slashQuery.value = '';
};

// Use wiki-links composable
const {
  wikiLinkMenuVisible,
  wikiLinkQuery,
  wikiLinkRange,
  handleWikiLinkSelect,
  handleWikiLinkCreate,
} = useWikiLinks(editor, {
  noteCreated: (noteId: string) => emit('noteCreated', noteId),
  navigateToNote: (noteId: string) => emit('navigate-to-note', noteId),
});

const pendingNestedNoteTitle = ref<string | null>(null);

const handleCreateNestedNote = async (title: string) => {
  try {
    // Check if current note exists (is saved)
    if (!props.noteId) {
      // Save the pending title and request parent to save the note first
      pendingNestedNoteTitle.value = title;
      nestedNoteLoading.value = true;
      emit('requestSave');
      // Keep modal open - it will be processed after save
      return;
    }

    nestedNoteLoading.value = true;

    // Create nested note with parentId = current note ID
    const newNote = await notesApi.create({
      title,
      content: '',
      parentId: props.noteId,
    });

    // Close modal
    nestedNoteModalVisible.value = false;
    nestedNoteLoading.value = false;
    pendingNestedNoteTitle.value = null;

    // Insert link to created note in editor
    if (editor.value) {
      const noteUrl = `/notes/${newNote.id}`;
      editor.value
        .chain()
        .focus()
        .insertContent([
          {
            type: 'text',
            text: `📄 ${title}`,
            marks: [
              {
                type: 'link',
                attrs: {
                  href: noteUrl,
                  target: '_self',
                },
              },
            ],
          },
          {
            type: 'text',
            text: ' ',
          },
        ])
        .run();
    }

    // Emit event to notify parent that a new note was created
    emit('noteCreated', newNote.id);
  } catch (error) {
    console.error('Failed to create nested note:', error);
    nestedNoteModalVisible.value = false;
    nestedNoteLoading.value = false;
    pendingNestedNoteTitle.value = null;
  }
};

// Watch for noteId changes to handle pending nested note creation
watch(() => props.noteId, (newNoteId) => {
  if (newNoteId && pendingNestedNoteTitle.value) {
    // Note was saved, now create the nested note
    handleCreateNestedNote(pendingNestedNoteTitle.value);
  }
});

const handleCreateFromTemplate = (content: string, icon: string, title: string) => {
  try {
    // Emit event to create new note from template
    emit('createFromTemplate', { title, content, icon });
  } catch (error) {
    console.error('Failed to create note from template:', error);
  }
};

// Use block operations composable
const {
  blockMenuVisible,
  blockMenuPosition,
  blockMenuActions,
  blockHandleVisible,
  blockHandlePosition,
  handleMouseMove,
  openBlockMenu,
  startDrag,
} = useBlockOperations(editor);

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return;

    try {
      // Обработка пустого контента
      if (!newValue || !newValue.trim()) {
        const currentContent = editor.value.getJSON();
        const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
        if (JSON.stringify(currentContent) !== JSON.stringify(emptyDoc)) {
          editor.value.commands.setContent(emptyDoc);
        }
        return;
      }

      // Определяем тип контента (JSON или HTML)
      let content;
      if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
        // Это JSON
        content = JSON.parse(newValue);
        const currentContent = editor.value.getJSON();
        if (JSON.stringify(content) !== JSON.stringify(currentContent)) {
          editor.value.commands.setContent(content);
        }
      } else {
        // Это HTML - TipTap может обрабатывать HTML напрямую
        const currentHTML = editor.value.getHTML();
        // Нормализуем HTML для сравнения (убираем лишние пробелы)
        const normalizeHTML = (html: string) => html.replace(/\s+/g, ' ').trim();
        if (normalizeHTML(currentHTML) !== normalizeHTML(newValue)) {
          editor.value.commands.setContent(newValue);
        }
      }
    } catch (error) {
      console.error('Failed to parse editor content:', error);
      // При ошибке парсинга установить пустой документ
      editor.value.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
@import './BlockEditor/styles/editor.css';
</style>
