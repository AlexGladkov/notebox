<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <div class="flex flex-1 overflow-hidden">
      <!-- Единая левая панель с деревом страниц -->
      <UnifiedSidebar
        :all-notes="notes"
        :search-query="searchQuery"
        :selected-note-id="activeNoteId"
        :expanded-notes="expandedNotes"
        :search-results="searchResults"
        @update:search-query="searchQuery = $event"
        @select-note="handleSelectNote"
        @create-root-page="handleCreateRootPage"
        @create-subpage="handleCreateSubpage"
        @toggle-expand="toggleExpandNote"
      />

      <!-- Правая панель с редактором -->
      <div class="flex-1 flex flex-col">
        <!-- Панель вкладок -->
        <TabBar
          v-if="tabs.length > 0"
          :tabs="tabs"
          :active-tab-id="activeTabId"
          @select-tab="setActiveTab"
          @close-tab="closeTab"
          @close-other-tabs="closeOtherTabs"
          @close-all-tabs="closeAllTabs"
          @move-tab="moveTab"
        />

        <!-- Редактор -->
        <div class="flex-1 overflow-hidden">
          <NoteEditor
            :note="currentNote"
            @update-note="handleUpdateNote"
          />
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @confirm="handleConfirmAction"
      @cancel="cancelConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useStorage } from './composables/useStorage';
import { useNotes } from './composables/useNotes';
import { useSearch } from './composables/useSearch';
import { useTheme } from './composables/useTheme';
import { useTabs } from './composables/useTabs';
import UnifiedSidebar from './components/UnifiedSidebar.vue';
import NoteEditor from './components/NoteEditor.vue';
import TabBar from './components/TabBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

// Инициализация темы
useTheme();

const { notes } = useStorage();
const {
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
  getAllDescendants,
  getChildrenCount,
  expandedNotes,
  toggleNoteExpanded,
  expandAllAncestors,
} = useNotes(notes);

// Система вкладок
const {
  tabs,
  activeTabId,
  openTab,
  closeTab,
  closeOtherTabs,
  closeAllTabs,
  setActiveTab,
  moveTab,
  getActiveNote,
  updateTabTitle,
  removeTabsByNoteId,
} = useTabs(getNoteById);

const searchQuery = ref('');
const { searchResults } = useSearch(notes, searchQuery);

const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  action: null as (() => void | Promise<void>) | null,
});

const currentNote = computed(() => {
  return getActiveNote();
});

const activeNoteId = computed(() => {
  const note = getActiveNote();
  return note?.id || null;
});

const handleSelectNote = (noteId: string, forceNewTab: boolean = false) => {
  const note = getNoteById(noteId);
  if (note) {
    openTab(noteId, forceNewTab);
    searchQuery.value = '';
  }
};

const handleCreateRootPage = async () => {
  try {
    const note = await createNote('Новая страница', null);
    openTab(note.id, false);
  } catch (error) {
    console.error('Не удалось создать страницу:', error);
  }
};

const handleCreateSubpage = async (parentId: string) => {
  const parentNote = getNoteById(parentId);
  if (!parentNote) return;

  try {
    const note = await createNote('Новая страница', parentId);
    expandAllAncestors(note.id);
    openTab(note.id, false);
  } catch (error) {
    console.error('Не удалось создать подстраницу:', error);
    alert(error instanceof Error ? error.message : 'Не удалось создать подстраницу');
  }
};

const toggleExpandNote = (noteId: string) => {
  toggleNoteExpanded(noteId);
};

const handleUpdateNote = async (updates: { title?: string; content?: string }) => {
  const note = getActiveNote();
  if (!note) return;

  try {
    await updateNote(note.id, updates);

    // Обновляем название вкладки при изменении заголовка
    if (updates.title !== undefined) {
      updateTabTitle(note.id, updates.title);
    }
  } catch (error) {
    console.error('Не удалось обновить заметку:', error);
  }
};

const handleDeleteNote = (noteId: string, cascadeDelete: boolean = true) => {
  const note = getNoteById(noteId);
  if (!note) return;

  const childrenCount = getChildrenCount(noteId);

  if (childrenCount > 0) {
    // Показываем диалог для заметок с детьми
    showDeleteNoteWithChildrenDialog(noteId, childrenCount);
  } else {
    // Обычное подтверждение удаления
    confirmDialog.show = true;
    confirmDialog.title = 'Удалить страницу?';
    confirmDialog.message = `Вы уверены, что хотите удалить страницу "${note.title}"?`;
    confirmDialog.action = async () => {
      try {
        await deleteNote(noteId, cascadeDelete);
        // Закрываем вкладки удаленной заметки
        removeTabsByNoteId(noteId);
      } catch (error) {
        console.error('Не удалось удалить заметку:', error);
      }
    };
  }
};

const showDeleteNoteWithChildrenDialog = (noteId: string, childrenCount: number) => {
  const note = getNoteById(noteId);
  if (!note) return;

  confirmDialog.show = true;
  confirmDialog.title = 'Удалить страницу с вложенными страницами?';
  confirmDialog.message = `У страницы "${note.title}" есть ${childrenCount} вложенных страниц. Удалить всё?`;
  confirmDialog.action = async () => {
    try {
      // Получаем все ID заметок, которые будут удалены (включая потомков)
      const descendants = getAllDescendants(noteId);
      const allNoteIds = [noteId, ...descendants.map(n => n.id)];

      await deleteNote(noteId, true); // cascade delete

      // Закрываем вкладки всех удаленных заметок
      allNoteIds.forEach(id => removeTabsByNoteId(id));
    } catch (error) {
      console.error('Не удалось удалить заметку:', error);
    }
  };
};

const handleConfirmAction = async () => {
  if (confirmDialog.action) {
    try {
      await confirmDialog.action();
    } catch (error) {
      console.error('Не удалось выполнить действие:', error);
    }
  }
  cancelConfirm();
};

const cancelConfirm = () => {
  confirmDialog.show = false;
  confirmDialog.title = '';
  confirmDialog.message = '';
  confirmDialog.action = null;
};
</script>
