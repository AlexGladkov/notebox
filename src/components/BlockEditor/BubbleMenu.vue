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

const shouldShow = ({ state, from, to, view }: any) => {
  const { doc, selection } = state;
  const { empty } = selection;

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && selection.$from.parent.isTextblock;

  // Проверяем, не находимся ли мы внутри atomic ноды (Database, etc.)
  // Проверяем не только parent, но и всех ancestors
  let isInsideAtomicNode = false;
  for (let d = selection.$from.depth; d >= 0; d--) {
    const node = selection.$from.node(d);
    // Проверяем atom или специфические типы нод (database, table, tableRow, tableCell)
    if (node.type.spec.atom === true ||
        node.type.name === 'database' ||
        node.type.name === 'table' ||
        node.type.name === 'tableRow' ||
        node.type.name === 'tableCell') {
      isInsideAtomicNode = true;
      break;
    }
  }

  // Дополнительная проверка через DOM - если мы внутри database-block
  if (view && view.dom) {
    try {
      const domAtPos = view.domAtPos(from);
      let element = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
      while (element && element !== view.dom) {
        if (element.classList && (element.classList.contains('database-block') || element.classList.contains('database-container'))) {
          isInsideAtomicNode = true;
          break;
        }
        element = element.parentElement;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Проверка через activeElement - если фокус на input/textarea внутри database
  if (typeof document !== 'undefined' && document.activeElement) {
    let el = document.activeElement;
    while (el && el !== document.body) {
      if (el.classList && (el.classList.contains('database-block') || el.classList.contains('database-container') || el.classList.contains('text-cell'))) {
        isInsideAtomicNode = true;
        break;
      }
      el = el.parentElement;
    }
  }

  if (empty || isEmptyTextBlock || isInsideAtomicNode) {
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

<style>
/* Dark theme */
.dark .bubble-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .menu-button {
  color: #d1d5db;
}

.dark .menu-button:hover {
  background-color: #374151;
}

.dark .menu-button.is-active {
  background-color: #1e3a5f;
  color: #60a5fa;
}

.dark .menu-divider {
  background-color: #4b5563;
}
</style>
