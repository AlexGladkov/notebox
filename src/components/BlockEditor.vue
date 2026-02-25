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
import { SlashCommand } from '../extensions/SlashCommand';
import { BlockComment } from '../extensions/BlockComment';

import EditorBubbleMenu from './BlockEditor/BubbleMenu.vue';
import SlashCommandMenu from './BlockEditor/SlashCommandMenu.vue';
import BlockMenu from './BlockEditor/BlockMenu.vue';
import CreateNestedNoteModal from './BlockEditor/CreateNestedNoteModal.vue';

import type { SlashCommand as SlashCommandType, BlockMenuAction } from '../types/editor';
import { notesApi } from '../api/notes';

const props = defineProps<{
  modelValue: string;
  noteId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'noteCreated': [noteId: string];
  'requestSave': [];
  'navigate-to-note': [noteId: string];
}>();

const slashMenuVisible = ref(false);
const slashQuery = ref('');
const slashMenuRef = ref<InstanceType<typeof SlashCommandMenu> | null>(null);
const nestedNoteModalVisible = ref(false);
const nestedNoteLoading = ref(false);
const blockMenuVisible = ref(false);
const blockMenuPosition = ref({ top: 0, left: 0 });
const blockMenuActions = ref<BlockMenuAction[]>([]);
const blockHandleVisible = ref(false);
const blockHandlePosition = ref<{ top: number; left: number } | null>(null);
const currentBlockPos = ref<number | null>(null);

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
  {
    id: 'nested',
    title: 'Вложенная заметка',
    description: 'Создать дочернюю заметку',
    icon: '📄',
    keywords: ['nested', 'child', 'subpage', 'вложенная', 'дочерняя'],
    command: (editor) => {
      // Delete slash command from text
      editor.chain().focus().deleteRange({ from: editor.state.selection.from - slashQuery.value.length - 1, to: editor.state.selection.to }).run();
      // Show modal to create nested note
      nestedNoteModalVisible.value = true;
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

// Block handle and menu functionality
const handleMouseMove = (event: MouseEvent) => {
  if (!editor.value) return;

  const target = event.target as HTMLElement;
  const editorElement = target.closest('.ProseMirror');

  if (!editorElement) {
    blockHandleVisible.value = false;
    return;
  }

  // Find the block node under the cursor
  const pos = editor.value.view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!pos) {
    blockHandleVisible.value = false;
    return;
  }

  const $pos = editor.value.state.doc.resolve(pos.pos);
  const blockNode = $pos.node($pos.depth);

  if (!blockNode || blockNode.type.name === 'doc') {
    blockHandleVisible.value = false;
    return;
  }

  // Get block position and coordinates
  const blockPos = $pos.before($pos.depth);
  const coords = editor.value.view.coordsAtPos(blockPos);

  // Get container offset for absolute positioning
  const containerRect = (editorElement as HTMLElement).getBoundingClientRect();
  const scrollTop = (editorElement as HTMLElement).scrollTop || 0;

  blockHandleVisible.value = true;
  blockHandlePosition.value = {
    top: coords.top - containerRect.top + scrollTop,
    left: coords.left - containerRect.left - 40, // Position handle to the left of the block
  };
  currentBlockPos.value = blockPos;
};

const openBlockMenu = (event: MouseEvent) => {
  if (!editor.value || currentBlockPos.value === null) return;

  event.preventDefault();
  event.stopPropagation();

  // Build menu actions
  const actions: BlockMenuAction[] = [
    {
      id: 'delete',
      label: 'Удалить блок',
      icon: '🗑️',
      action: () => deleteBlock(),
    },
    {
      id: 'duplicate',
      label: 'Дублировать блок',
      icon: '📋',
      action: () => duplicateBlock(),
    },
    {
      id: 'move-up',
      label: 'Переместить вверх',
      icon: '⬆️',
      action: () => moveBlockUp(),
    },
    {
      id: 'move-down',
      label: 'Переместить вниз',
      icon: '⬇️',
      action: () => moveBlockDown(),
    },
    {
      id: 'copy-text',
      label: 'Скопировать как текст',
      icon: '📄',
      action: () => copyBlockAsText(),
    },
    {
      id: 'text-color',
      label: 'Цвет текста',
      icon: '🎨',
      action: () => changeTextColor(),
    },
    {
      id: 'bg-color',
      label: 'Цвет фона',
      icon: '🖌️',
      action: () => changeBackgroundColor(),
    },
    {
      id: 'comment',
      label: 'Добавить комментарий',
      icon: '💬',
      action: () => addBlockComment(),
    },
  ];

  blockMenuActions.value = actions;
  blockMenuPosition.value = {
    top: event.clientY,
    left: event.clientX,
  };
  blockMenuVisible.value = true;
};

const deleteBlock = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  editor.value.chain().focus().deleteRange({ from, to }).run();
  blockMenuVisible.value = false;
};

const duplicateBlock = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
  const blockNode = $pos.node($pos.depth);
  const to = $pos.after($pos.depth);

  editor.value.chain().focus().insertContentAt(to, blockNode.toJSON()).run();
  blockMenuVisible.value = false;
};

const moveBlockUp = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const { state, view } = editor.value;
  const $pos = state.doc.resolve(currentBlockPos.value);
  const blockNode = $pos.node($pos.depth);

  // Find previous block
  if ($pos.depth === 0 || $pos.index($pos.depth - 1) === 0) {
    // Already at top
    blockMenuVisible.value = false;
    return;
  }

  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  // Get previous sibling position
  const prevPos = state.doc.resolve(from - 1);
  const prevFrom = prevPos.before(prevPos.depth);

  // Delete current block and insert before previous
  const tr = state.tr;
  tr.delete(from, to);
  tr.insert(prevFrom, blockNode);
  view.dispatch(tr);

  blockMenuVisible.value = false;
};

const moveBlockDown = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const { state, view } = editor.value;
  const $pos = state.doc.resolve(currentBlockPos.value);
  const blockNode = $pos.node($pos.depth);
  const parent = $pos.node($pos.depth - 1);

  // Check if not last block
  if ($pos.index($pos.depth - 1) >= parent.childCount - 1) {
    // Already at bottom
    blockMenuVisible.value = false;
    return;
  }

  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  // Get next sibling position
  const nextPos = state.doc.resolve(to + 1);
  const nextTo = nextPos.after(nextPos.depth);

  // Delete current block and insert after next
  const tr = state.tr;
  tr.delete(from, to);
  tr.insert(nextTo - (to - from), blockNode);
  view.dispatch(tr);

  blockMenuVisible.value = false;
};

const copyBlockAsText = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
  const blockNode = $pos.node($pos.depth);
  const text = blockNode.textContent;

  navigator.clipboard.writeText(text).then(() => {
    console.log('Block text copied to clipboard');
  });

  blockMenuVisible.value = false;
};

const changeTextColor = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const color = window.prompt('Введите цвет текста (например, #ff0000):');
  if (color) {
    const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
    const from = $pos.start($pos.depth);
    const to = $pos.end($pos.depth);

    editor.value.chain().focus().setTextSelection({ from, to }).setColor(color).run();
  }

  blockMenuVisible.value = false;
};

const changeBackgroundColor = () => {
  if (!editor.value || currentBlockPos.value === null) return;

  const color = window.prompt('Введите цвет фона (например, #ffff00):');
  if (color) {
    const $pos = editor.value.state.doc.resolve(currentBlockPos.value);
    const from = $pos.start($pos.depth);
    const to = $pos.end($pos.depth);

    editor.value.chain().focus().setTextSelection({ from, to }).setHighlight({ color }).run();
  }

  blockMenuVisible.value = false;
};

const addBlockComment = () => {
  if (!editor.value) return;

  const comment = window.prompt('Введите комментарий к блоку:');
  if (comment) {
    editor.value.chain().focus().setBlockComment(comment).run();
  }

  blockMenuVisible.value = false;
};

const startDrag = (event: MouseEvent) => {
  // Basic drag functionality - can be enhanced with more sophisticated drag & drop
  event.preventDefault();
  // Drag & drop will be handled by native draggable attribute
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

.dark :deep(.block-editor-content .ProseMirror) {
  color: #e5e7eb;
}

.block-editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.dark :deep(.block-editor-content .ProseMirror p.is-editor-empty:first-child::before) {
  color: #6b7280;
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

.dark :deep(.block-editor-content .ProseMirror blockquote) {
  border-left-color: #4b5563;
  color: #9ca3af;
}

.block-editor-content :deep(.ProseMirror code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}

.dark :deep(.block-editor-content .ProseMirror code) {
  background-color: #374151;
  color: #e5e7eb;
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

.dark :deep(.block-editor-content .ProseMirror hr) {
  border-top-color: #4b5563;
}

.block-editor-content :deep(.ProseMirror a) {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

.block-editor-content :deep(.ProseMirror a:hover) {
  color: #1e40af;
}

.dark :deep(.block-editor-content .ProseMirror a) {
  color: #60a5fa;
}

.dark :deep(.block-editor-content .ProseMirror a:hover) {
  color: #93c5fd;
}

.block-editor-content :deep(.ProseMirror mark) {
  background-color: #fef3c7;
  padding: 0.1em 0.2em;
  border-radius: 0.2em;
}

.dark :deep(.block-editor-content .ProseMirror mark) {
  background-color: #854d0e;
  color: #fef3c7;
}

.block-editor-content :deep(.slash-command-active) {
  background-color: #f3f4f6;
  border-radius: 0.25em;
  padding: 0 0.2em;
}

.dark :deep(.block-editor-content .slash-command-active) {
  background-color: #374151;
}

.block-editor-content-wrapper {
  position: relative;
  height: 100%;
}

.block-handle {
  position: absolute;
  width: 32px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  font-size: 14px;
  color: #9ca3af;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  opacity: 0.8;
  transition: all 0.2s ease;
  user-select: none;
  z-index: 50;
}

.block-handle:hover {
  opacity: 1;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark :deep(.block-handle) {
  background-color: #374151;
  border-color: #4b5563;
  color: #9ca3af;
}

.dark :deep(.block-handle:hover) {
  color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.block-handle:active {
  cursor: grabbing;
}
</style>
