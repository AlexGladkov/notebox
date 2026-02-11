<template>
  <bubble-menu
    :editor="editor"
    :tippy-options="{ duration: 100 }"
    :should-show="shouldShow"
    class="bubble-menu-wrapper"
  >
    <div class="bubble-menu">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="menu-button"
        title="Жирный (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="menu-button"
        title="Курсив (Ctrl+I)"
      >
        <em>I</em>
      </button>

      <button
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ 'is-active': editor.isActive('underline') }"
        class="menu-button"
        title="Подчеркнутый (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <button
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="menu-button"
        title="Зачеркнутый"
      >
        <s>S</s>
      </button>

      <div class="menu-divider"></div>

      <button
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        class="menu-button"
        title="Код (Ctrl+E)"
      >
        &lt;/&gt;
      </button>

      <button
        @click="editor.chain().focus().toggleHighlight().run()"
        :class="{ 'is-active': editor.isActive('highlight') }"
        class="menu-button"
        title="Выделение"
      >
        ✨
      </button>

      <div class="menu-divider"></div>

      <button
        @click="setLink"
        :class="{ 'is-active': editor.isActive('link') }"
        class="menu-button"
        title="Ссылка (Ctrl+K)"
      >
        🔗
      </button>
    </div>
  </bubble-menu>
</template>

<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3';
import type { Editor } from '@tiptap/vue-3';

const props = defineProps<{
  editor: Editor;
}>();

const shouldShow = ({ state, from, to }: any) => {
  const { doc, selection } = state;
  const { empty } = selection;

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && selection.$from.parent.isTextblock;

  if (empty || isEmptyTextBlock) {
    return false;
  }

  return true;
};

const setLink = () => {
  const previousUrl = props.editor.getAttributes('link').href;
  const url = window.prompt('Введите URL:', previousUrl);

  if (url === null) {
    return;
  }

  if (url === '') {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
};
</script>

<style scoped>
.bubble-menu-wrapper {
  z-index: 100;
}

.bubble-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
  transition: all 0.15s ease;
}

.menu-button:hover {
  background-color: #f3f4f6;
}

.menu-button.is-active {
  background-color: #dbeafe;
  color: #1e40af;
}

.menu-divider {
  width: 1px;
  height: 20px;
  background-color: #e5e7eb;
  margin: 0 4px;
}
</style>
