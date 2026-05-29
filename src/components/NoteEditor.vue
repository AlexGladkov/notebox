<template>
  <div v-if="note" class="h-full flex flex-col bg-white dark:bg-gray-900">
    <!-- Компонент обложки всегда рендерится, чтобы можно было добавить backdrop -->
    <NoteCover
      :backdrop-type="note.backdropType"
      :backdrop-value="note.backdropValue"
      :backdrop-position-y="note.backdropPositionY"
      @update="handleCoverUpdate"
    >
      <template #icon>
        <!-- Иконка поверх обложки, только если обложка есть -->
        <div class="icon-over-cover" v-if="note.backdropType">
          <NoteIcon
            :icon="note.icon"
            @update="handleIconUpdate"
          />
        </div>
      </template>
    </NoteCover>

    <div class="note-header border-b border-gray-200 dark:border-gray-700 p-4">
      <!-- Если нет обложки, иконка отдельно над заголовком -->
      <NoteIcon
        v-if="!note.backdropType"
        :icon="note.icon"
        @update="handleIconUpdate"
      />

      <input
        v-model="localTitle"
        @input="handleTitleChange"
        placeholder="Название заметки..."
        class="note-title w-full text-2xl md:text-3xl font-semibold outline-none border-none focus:ring-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
      />
      <div class="flex items-center justify-between mt-2">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Изменено: {{ formatDate(note.updatedAt) }}
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="openReminderModal"
            class="reminder-button touch-target"
            title="Добавить напоминание"
          >
            <span>🔔</span>
          </button>
          <ExportButton :note="note" />
        </div>
      </div>

      <!-- Напоминание -->
      <ReminderBadge
        v-if="noteReminder"
        :reminder="noteReminder"
        @edit="openReminderModal"
        class="mt-2"
      />

      <!-- Теги заметки -->
      <NoteTags
        :selected-tag-ids="note.tags?.map(t => t.id) || []"
        :available-tags="availableTags"
        @add-tag="handleAddTag"
        @remove-tag="handleRemoveTag"
        @create-tag="handleCreateTag"
      />
    </div>

    <div class="flex-1 overflow-y-auto">
      <BlockEditor
        v-model="localContent"
        :note-id="note?.id"
        :all-notes="props.allNotes || []"
        @update:model-value="handleContentChange"
        @note-created="handleNoteCreated"
        @navigate-to-note="handleNavigateToNote"
        @create-from-template="handleCreateFromTemplate"
        @open-reminder-modal="openReminderModal"
      />

      <!-- Секция backlinks -->
      <Backlinks
        v-if="props.backlinks && props.backlinks.length > 0"
        :backlinks="props.backlinks"
        @navigate="handleNavigateToNote"
      />
    </div>
  </div>

  <div v-else class="h-full flex items-center justify-center">
    <EmptyState message="Выберите заметку для редактирования" />
  </div>

  <!-- Модальное окно напоминания -->
  <ReminderModal
    :visible="reminderModalVisible"
    :note-id="note?.id || ''"
    :note-title="note?.title"
    :reminder="noteReminder"
    @close="closeReminderModal"
    @saved="handleReminderSaved"
  />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Note, Tag } from '../types';
import type { Reminder } from '../types/reminder';
import EmptyState from './EmptyState.vue';
import BlockEditor from './BlockEditor.vue';
import NoteCover from './NoteCover.vue';
import NoteIcon from './NoteIcon.vue';
import NoteTags from './NoteTags.vue';
import ExportButton from './ExportButton.vue';
import Backlinks from './Backlinks.vue';
import ReminderBadge from './reminder/ReminderBadge.vue';
import ReminderModal from './reminder/ReminderModal.vue';
import { useReminders } from '../composables/useReminders';

const props = defineProps<{
  note: Note | undefined;
  availableTags: Tag[];
  backlinks?: { note: Note; context: string }[];
  allNotes?: Note[];
}>();

const emit = defineEmits<{
  updateNote: [updates: {
    title?: string;
    content?: string;
    icon?: string | null;
    backdropType?: string | null;
    backdropValue?: string | null;
    backdropPositionY?: number;
  }];
  noteCreated: [noteId: string];
  navigateToNote: [noteId: string];
  addTag: [tagId: string];
  removeTag: [tagId: string];
  createTag: [name: string];
  createFromTemplate: [data: { title: string; content: string; icon: string }];
}>();

const localTitle = ref('');
const localContent = ref('');
let debounceTimer: number | null = null;

const { fetchRemindersByNoteId } = useReminders();
const noteReminder = ref<Reminder | undefined>(undefined);
const reminderModalVisible = ref(false);

watch(
  () => props.note,
  (newNote) => {
    if (newNote) {
      localTitle.value = newNote.title;
      localContent.value = newNote.content;

      // Загружаем напоминание для заметки
      const reminders = fetchRemindersByNoteId(newNote.id);
      noteReminder.value = reminders.length > 0 ? reminders[0] : undefined;
    } else {
      localTitle.value = '';
      localContent.value = '';
      noteReminder.value = undefined;
    }
  },
  { immediate: true }
);

const openReminderModal = () => {
  reminderModalVisible.value = true;
};

const closeReminderModal = () => {
  reminderModalVisible.value = false;
};

const handleReminderSaved = (reminder: Reminder) => {
  noteReminder.value = reminder;
  // Обновляем список напоминаний
  if (props.note) {
    const reminders = fetchRemindersByNoteId(props.note.id);
    noteReminder.value = reminders.length > 0 ? reminders[0] : undefined;
  }
};

const handleTitleChange = () => {
  debounceUpdate({ title: localTitle.value });
};

const handleContentChange = (content: string) => {
  localContent.value = content;
  debounceUpdate({ content });
};

const debounceUpdate = (updates: {
  title?: string;
  content?: string;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
}) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    emit('updateNote', updates);
  }, 500);
};

const handleIconUpdate = (icon: string | null) => {
  emit('updateNote', { icon });
};

const handleCoverUpdate = (type: string | null, value: string | null, positionY: number) => {
  emit('updateNote', {
    backdropType: type,
    backdropValue: value,
    backdropPositionY: positionY,
  });
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleNoteCreated = (noteId: string) => {
  // Forward the event to parent component (MainView)
  emit('noteCreated', noteId);
};

const handleNavigateToNote = (noteId: string) => {
  emit('navigateToNote', noteId);
};

const handleAddTag = (tagId: string) => {
  emit('addTag', tagId);
};

const handleRemoveTag = (tagId: string) => {
  emit('removeTag', tagId);
};

const handleCreateTag = (name: string) => {
  emit('createTag', name);
};

const handleCreateFromTemplate = (data: { title: string; content: string; icon: string }) => {
  emit('createFromTemplate', data);
};

// Cleanup debounce таймера при размонтировании
onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<style scoped>
.icon-over-cover {
  position: absolute;
  bottom: -39px;
  left: 24px;
  z-index: 10;
  pointer-events: auto;
}

/* Sticky header на мобильных */
@media (max-width: 767px) {
  .note-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background-color: white;
  }

  .dark .note-header {
    background-color: #111827;
  }

  .note-title {
    font-size: 1.5rem;
  }
}

/* Touch-friendly target */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

.reminder-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  background-color: transparent;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

@media (max-width: 767px) {
  .reminder-button {
    padding: 0.5rem 0.875rem;
    font-size: 1.125rem;
  }
}

.dark .reminder-button {
  border-color: #4b5563;
}

.reminder-button:hover {
  background-color: #f3f4f6;
}

.dark .reminder-button:hover {
  background-color: #374151;
}
</style>
