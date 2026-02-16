<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <div class="flex flex-1 overflow-hidden">
      <Sidebar
      :folders="folders"
      :search-query="searchQuery"
      :selected-folder-id="selectedFolderId"
      :selected-note-id="activeNoteId"
      :expanded-folders="expandedFolders"
      :search-results="searchResults"
      @update:search-query="searchQuery = $event"
      @select-folder="handleSelectFolder"
      @select-note="handleSelectNote"
      @create-root-folder="handleCreateRootFolder"
      @create-subfolder="handleCreateSubfolder"
      @rename-folder="handleRenameFolder"
      @delete-folder="handleDeleteFolder"
      @toggle-expand="toggleExpandFolder"
    />

      <div class="flex-1 flex overflow-hidden">
        <div v-if="selectedFolderId" class="w-80 border-r border-gray-200 dark:border-gray-700">
          <NoteList
            :notes="currentFolderNotes"
            :folder-name="currentFolder?.name"
            :selected-note-id="activeNoteId"
            @create-note="handleCreateNote"
            @select-note="handleSelectNote"
            @delete-note="handleDeleteNote"
          />
        </div>

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
import { useFolders } from './composables/useFolders';
import { useNotes } from './composables/useNotes';
import { useSearch } from './composables/useSearch';
import { useTheme } from './composables/useTheme';
import { useTabs } from './composables/useTabs';
import Sidebar from './components/Sidebar.vue';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
import TabBar from './components/TabBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

// Инициализация темы
useTheme();

const { folders, notes } = useStorage();
const {
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderById,
} = useFolders(folders);

const {
  createNote,
  updateNote,
  deleteNote,
  deleteNotesByFolderIds,
  getNoteById,
  getNotesByFolder,
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
  removeTabsByFolderIds,
} = useTabs(getNoteById);

const searchQuery = ref('');
const { searchResults } = useSearch(notes, searchQuery);

const selectedFolderId = ref<string | null>(null);
const expandedFolders = ref<Set<string>>(new Set());

const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  action: null as (() => void | Promise<void>) | null,
});

const currentFolder = computed(() => {
  return selectedFolderId.value ? getFolderById(selectedFolderId.value) : undefined;
});

const currentFolderNotes = computed(() => {
  if (!selectedFolderId.value) return [];
  return getNotesByFolder(selectedFolderId.value).value;
});

const currentNote = computed(() => {
  return getActiveNote();
});

const activeNoteId = computed(() => {
  const note = getActiveNote();
  return note?.id || null;
});

const handleSelectFolder = (folderId: string) => {
  selectedFolderId.value = folderId;
  searchQuery.value = '';
};

const handleSelectNote = (noteId: string, forceNewTab: boolean = false) => {
  const note = getNoteById(noteId);
  if (note) {
    selectedFolderId.value = note.folderId;
    openTab(noteId, forceNewTab);
    searchQuery.value = '';
  }
};

const handleCreateRootFolder = async () => {
  try {
    const folder = await createFolder('Новая папка', null);
    selectedFolderId.value = folder.id;
    selectedNoteId.value = null;
    expandedFolders.value.add(folder.id);
  } catch (error) {
    console.error('Не удалось создать папку:', error);
  }
};

const handleCreateSubfolder = async (parentId: string) => {
  try {
    const folder = await createFolder('Новая папка', parentId);
    expandedFolders.value.add(parentId);
    expandedFolders.value.add(folder.id);
  } catch (error) {
    console.error('Не удалось создать подпапку:', error);
  }
};

const handleRenameFolder = async (folderId: string, name: string) => {
  try {
    await updateFolder(folderId, name);
  } catch (error) {
    console.error('Не удалось переименовать папку:', error);
  }
};

const handleDeleteFolder = (folderId: string) => {
  const folder = getFolderById(folderId);
  if (!folder) return;

  const countNotes = (id: string): number => {
    const folderNotes = getNotesByFolder(id).value;
    const childFolders = folders.value.filter(f => f.parentId === id);
    return folderNotes.length + childFolders.reduce((sum, child) => sum + countNotes(child.id), 0);
  };

  const totalNotes = countNotes(folderId);
  const childFolders = folders.value.filter(f => f.parentId === folderId);

  confirmDialog.show = true;
  confirmDialog.title = 'Удалить папку?';
  confirmDialog.message = `Вы уверены, что хотите удалить папку "${folder.name}"? ${
    totalNotes > 0 || childFolders.length > 0
      ? `Это также удалит ${childFolders.length} подпапок и ${totalNotes} заметок.`
      : ''
  }`;
  confirmDialog.action = async () => {
    try {
      const deletedFolderIds = await deleteFolder(folderId);
      deleteNotesByFolderIds(deletedFolderIds);

      // Закрываем все вкладки с заметками из удаленных папок
      removeTabsByFolderIds(deletedFolderIds);

      if (selectedFolderId.value === folderId || deletedFolderIds.includes(selectedFolderId.value || '')) {
        selectedFolderId.value = null;
      }

      deletedFolderIds.forEach(id => expandedFolders.value.delete(id));
    } catch (error) {
      console.error('Не удалось удалить папку:', error);
    }
  };
};

const handleCreateNote = async () => {
  if (!selectedFolderId.value) return;

  try {
    const note = await createNote('Новая заметка', selectedFolderId.value);
    openTab(note.id, false);
  } catch (error) {
    console.error('Не удалось создать заметку:', error);
  }
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

const handleDeleteNote = (noteId: string) => {
  const note = getNoteById(noteId);
  if (!note) return;

  confirmDialog.show = true;
  confirmDialog.title = 'Удалить заметку?';
  confirmDialog.message = `Вы уверены, что хотите удалить заметку "${note.title}"?`;
  confirmDialog.action = async () => {
    try {
      await deleteNote(noteId);
      // Закрываем все вкладки с этой заметкой
      removeTabsByNoteId(noteId);
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

const toggleExpandFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId);
  } else {
    expandedFolders.value.add(folderId);
  }
};
</script>
