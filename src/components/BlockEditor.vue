<template>
  <div class="block-editor-wrapper">
    <editor-content :editor="editor" class="block-editor-content" />

    <EditorBubbleMenu v-if="editor" :editor="editor" />

    <SlashCommandMenu
      v-if="editor"
      :editor="editor"
      :visible="slashMenuVisible"
      :query="slashQuery"
      :commands="slashCommands"
      @command-selected="handleSlashCommand"
    />

    <BlockMenu
      v-if="blockMenuVisible"
      :visible="blockMenuVisible"
      :actions="blockMenuActions"
      :position="blockMenuPosition"
      @close="blockMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
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
import { SlashCommand, SlashCommandPluginKey } from '../extensions/SlashCommand';
import { BlockComment } from '../extensions/BlockComment';

import EditorBubbleMenu from './BlockEditor/BubbleMenu.vue';
import SlashCommandMenu from './BlockEditor/SlashCommandMenu.vue';
import BlockMenu from './BlockEditor/BlockMenu.vue';

import type { SlashCommand as SlashCommandType, BlockMenuAction } from '../types/editor';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const slashMenuVisible = ref(false);
const slashQuery = ref('');
const blockMenuVisible = ref(false);
const blockMenuPosition = ref({ top: 0, left: 0 });
const blockMenuActions = ref<BlockMenuAction[]>([]);

const slashCommands = computed<SlashCommandType[]>(() => [
  {
    id: 'h1',
    title: 'Заголовок 1',
    description: 'Большой заголовок раздела',
    icon: 'H1',
    keywords: ['heading', 'h1', 'заголовок'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setHeading({ level: 1 }).run();
    },
  },
  {
    id: 'h2',
    title: 'Заголовок 2',
    description: 'Средний заголовок',
    icon: 'H2',
    keywords: ['heading', 'h2', 'заголовок'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setHeading({ level: 2 }).run();
    },
  },
  {
    id: 'h3',
    title: 'Заголовок 3',
    description: 'Маленький заголовок',
    icon: 'H3',
    keywords: ['heading', 'h3', 'заголовок'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setHeading({ level: 3 }).run();
    },
  },
  {
    id: 'bullet-list',
    title: 'Маркированный список',
    description: 'Создать простой список',
    icon: '•',
    keywords: ['list', 'bullet', 'список'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).toggleBulletList().run();
    },
  },
  {
    id: 'numbered-list',
    title: 'Нумерованный список',
    description: 'Создать нумерованный список',
    icon: '1.',
    keywords: ['list', 'numbered', 'ordered', 'список'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).toggleOrderedList().run();
    },
  },
  {
    id: 'todo-list',
    title: 'Список задач',
    description: 'Создать чекбокс список',
    icon: '☑',
    keywords: ['todo', 'checkbox', 'task', 'задачи'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).toggleTaskList().run();
    },
  },
  {
    id: 'blockquote',
    title: 'Цитата',
    description: 'Добавить цитату',
    icon: '❝',
    keywords: ['quote', 'blockquote', 'цитата'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    title: 'Блок кода',
    description: 'Добавить блок кода',
    icon: '</>',
    keywords: ['code', 'codeblock', 'код'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).toggleCodeBlock().run();
    },
  },
  {
    id: 'divider',
    title: 'Разделитель',
    description: 'Добавить горизонтальную линию',
    icon: '—',
    keywords: ['divider', 'hr', 'separator', 'разделитель'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setHorizontalRule().run();
    },
  },
  {
    id: 'callout-info',
    title: 'Информация',
    description: 'Синяя выноска с информацией',
    icon: 'ℹ️',
    keywords: ['callout', 'info', 'информация'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setCallout({ type: 'info' }).run();
    },
  },
  {
    id: 'callout-warning',
    title: 'Предупреждение',
    description: 'Желтая выноска с предупреждением',
    icon: '⚠️',
    keywords: ['callout', 'warning', 'предупреждение'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setCallout({ type: 'warning' }).run();
    },
  },
  {
    id: 'callout-error',
    title: 'Ошибка',
    description: 'Красная выноска с ошибкой',
    icon: '❌',
    keywords: ['callout', 'error', 'ошибка'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setCallout({ type: 'error' }).run();
    },
  },
  {
    id: 'callout-success',
    title: 'Успех',
    description: 'Зеленая выноска с успехом',
    icon: '✅',
    keywords: ['callout', 'success', 'tip', 'успех'],
    command: (editor) => {
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).setCallout({ type: 'success' }).run();
    },
  },
]);

const editor = useEditor({
  content: props.modelValue,
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
    }),
    BlockComment,
  ],
  onUpdate: ({ editor }) => {
    const json = editor.getJSON();
    emit('update:modelValue', JSON.stringify(json));
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none',
    },
  },
});

const handleSlashCommand = () => {
  slashMenuVisible.value = false;
  slashQuery.value = '';
};

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return;

    try {
      const json = JSON.parse(newValue);
      const currentContent = editor.value.getJSON();

      if (JSON.stringify(json) !== JSON.stringify(currentContent)) {
        editor.value.commands.setContent(json);
      }
    } catch (error) {
      console.error('Failed to parse editor content:', error);
    }
  }
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
.block-editor-wrapper {
  position: relative;
  height: 100%;
  overflow-y: auto;
}

.block-editor-content {
  padding: 2rem;
  min-height: 100%;
}

.block-editor-content :deep(.ProseMirror) {
  min-height: 100%;
  outline: none;
}

.block-editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.block-editor-content :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

.block-editor-content :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  line-height: 1.3;
}

.block-editor-content :deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.6em;
  margin-bottom: 0.3em;
  line-height: 1.4;
}

.block-editor-content :deep(.ProseMirror p) {
  margin: 0.5em 0;
  line-height: 1.6;
}

.block-editor-content :deep(.ProseMirror ul),
.block-editor-content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.block-editor-content :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.block-editor-content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.block-editor-content :deep(.ProseMirror ul[data-type="taskList"] li label) {
  flex-shrink: 0;
  margin-top: 0.3em;
}

.block-editor-content :deep(.ProseMirror ul[data-type="taskList"] li input[type="checkbox"]) {
  cursor: pointer;
}

.block-editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1em;
  color: #6b7280;
  margin: 1em 0;
  font-style: italic;
}

.block-editor-content :deep(.ProseMirror code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}

.block-editor-content :deep(.ProseMirror pre) {
  background-color: #1f2937;
  color: #f3f4f6;
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
  margin: 1em 0;
}

.block-editor-content :deep(.ProseMirror pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.block-editor-content :deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 2em 0;
}

.block-editor-content :deep(.ProseMirror a) {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

.block-editor-content :deep(.ProseMirror a:hover) {
  color: #1e40af;
}

.block-editor-content :deep(.ProseMirror mark) {
  background-color: #fef3c7;
  padding: 0.1em 0.2em;
  border-radius: 0.2em;
}

.block-editor-content :deep(.slash-command-active) {
  background-color: #f3f4f6;
  border-radius: 0.25em;
  padding: 0 0.2em;
}
</style>
