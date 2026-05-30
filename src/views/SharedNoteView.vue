<template>
  <div class="shared-note-view">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка страницы...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="error-icon"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorMessage }}</p>
      </div>
    </div>

    <div v-else-if="note" class="note-container">
      <header class="note-header-top">
        <div class="header-brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>NoteBox</span>
        </div>
      </header>

      <div class="note-content-wrapper">
        <NoteCover
          v-if="note.backdropType"
          :backdrop-type="note.backdropType"
          :backdrop-value="note.backdropValue"
          :backdrop-position-y="note.backdropPositionY"
          :readonly="true"
        >
          <template #icon>
            <div class="icon-over-cover" v-if="note.backdropType && note.icon">
              <span class="note-icon-large">{{ note.icon }}</span>
            </div>
          </template>
        </NoteCover>

        <div class="note-main-content">
          <div v-if="!note.backdropType && note.icon" class="note-icon-standalone">
            <span class="note-icon-large">{{ note.icon }}</span>
          </div>

          <h1 class="note-title">{{ note.title || 'Без названия' }}</h1>

          <div v-if="note.tags && note.tags.length > 0" class="note-tags">
            <span
              v-for="tag in note.tags"
              :key="tag.id"
              class="tag"
              :style="{ backgroundColor: tag.color + '20', color: tag.color }"
            >
              {{ tag.name }}
            </span>
          </div>

          <div class="note-meta">
            <span>Обновлено: {{ formatDate(note.updatedAt) }}</span>
          </div>

          <div class="note-content">
            <editor-content :editor="editor" class="readonly-editor" />
          </div>
        </div>
      </div>

      <footer class="note-footer">
        <p>Создано в <strong>NoteBox</strong></p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import { Callout } from '../extensions/CalloutExtension';
import { Database } from '../extensions/DatabaseExtension';
import { WikiLink } from '../extensions/WikiLinkExtension';

import type { Note } from '../types';
import { shareApi } from '../api/share';
import { ApiError } from '../api/client';
import NoteCover from '../components/NoteCover.vue';

const route = useRoute();

const note = ref<Note | null>(null);
const loading = ref(true);
const error = ref(false);
const errorTitle = ref('');
const errorMessage = ref('');

const parseContent = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

const editor = shallowRef<Editor | null>(null);

const loadNote = async () => {
  const token = route.params.token as string;

  if (!token) {
    error.value = true;
    errorTitle.value = 'Недействительная ссылка';
    errorMessage.value = 'Ссылка не содержит токен доступа';
    loading.value = false;
    return;
  }

  try {
    const data = await shareApi.getPublicNote(token);
    note.value = data;

    editor.value = new Editor({
      content: parseContent(data.content),
      editable: false,
      extensions: [
        StarterKit,
        Highlight,
        Underline,
        Link.configure({
          openOnClick: true,
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        TextStyle,
        Color,
        Callout,
        Database,
        WikiLink,
      ],
    });

    loading.value = false;
  } catch (err) {
    console.error('Ошибка при загрузке публичной страницы:', err);
    error.value = true;

    if (err instanceof ApiError) {
      if (err.status === 404) {
        errorTitle.value = 'Страница не найдена';
        errorMessage.value = 'Страница не найдена или ссылка больше не действительна';
      } else {
        errorTitle.value = 'Ошибка загрузки';
        errorMessage.value = err.message || 'Не удалось загрузить страницу';
      }
    } else {
      errorTitle.value = 'Ошибка сети';
      errorMessage.value = 'Проверьте подключение к интернету и попробуйте снова';
    }

    loading.value = false;
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч. назад`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} д. назад`;

  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

onMounted(() => {
  loadNote();
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<style scoped>
.shared-note-view {
  min-height: 100vh;
  background: #f9fafb;
}

.loading-container,
.error-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p {
  color: #6b7280;
  font-size: 16px;
}

.error-content {
  max-width: 400px;
}

.error-icon {
  color: #ef4444;
  margin-bottom: 16px;
}

.error-content h2 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.error-content p {
  color: #6b7280;
  font-size: 16px;
  line-height: 1.5;
}

.note-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.note-header-top {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-weight: 600;
  font-size: 18px;
}

.header-brand svg {
  color: #3b82f6;
}

.note-content-wrapper {
  flex: 1;
}

.note-main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}

.note-icon-standalone {
  margin-bottom: 16px;
}

.icon-over-cover {
  padding: 24px;
}

.note-icon-large {
  font-size: 64px;
  line-height: 1;
  display: inline-block;
}

.note-title {
  font-size: 40px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  line-height: 1.2;
  word-wrap: break-word;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.note-meta {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.note-content {
  color: #374151;
  line-height: 1.7;
}

.readonly-editor {
  outline: none;
}

.readonly-editor :deep(.ProseMirror) {
  outline: none;
  min-height: auto;
  padding: 0;
}

.readonly-editor :deep(.ProseMirror p) {
  margin: 0.75em 0;
}

.readonly-editor :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 1.5em 0 0.5em;
}

.readonly-editor :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 1.25em 0 0.5em;
}

.readonly-editor :deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0 0.5em;
}

.readonly-editor :deep(.ProseMirror ul),
.readonly-editor :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.75em 0;
}

.readonly-editor :deep(.ProseMirror blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  margin: 1em 0;
  color: #6b7280;
}

.readonly-editor :deep(.ProseMirror code) {
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.readonly-editor :deep(.ProseMirror pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.readonly-editor :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.readonly-editor :deep(.ProseMirror a) {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

.readonly-editor :deep(.ProseMirror mark) {
  background: #fef3c7;
  padding: 0.1em 0;
}

.readonly-editor :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.readonly-editor :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  gap: 0.5em;
  align-items: flex-start;
}

.readonly-editor :deep(.ProseMirror ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-top: 0.15em;
}

.readonly-editor :deep(.ProseMirror ul[data-type="taskList"] li > div) {
  flex: 1;
}

.note-footer {
  padding: 24px;
  text-align: center;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 14px;
}

.note-footer strong {
  color: #111827;
}

@media (max-width: 640px) {
  .note-main-content {
    padding: 24px 16px;
  }

  .note-title {
    font-size: 32px;
  }

  .note-icon-large {
    font-size: 48px;
  }
}
</style>
