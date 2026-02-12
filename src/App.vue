<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <Header />

    <div class="flex flex-1 overflow-hidden">
      <Sidebar
      :folders="folders"
      :search-query="searchQuery"
      :selected-folder-id="selectedFolderId"
      :selected-note-id="selectedNoteId"
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
        <div v-if="selectedFolderId && !selectedNoteId" class="w-80 border-r border-gray-200 dark:border-gray-700">
          <NoteList
            :notes="currentFolderNotes"
            :folder-name="currentFolder?.name"
            :selected-note-id="selectedNoteId"
            @create-note="handleCreateNote"
            @select-note="handleSelectNote"
            @delete-note="handleDeleteNote"
          />
        </div>

        <div class="flex-1">
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
import { useFolders } from './composables/useFolders';
import { useNotes } from './composables/useNotes';
import { useSearch } from './composables/useSearch';
import { useTheme } from './composables/useTheme';
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
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

const searchQuery = ref('');
const { searchResults } = useSearch(notes, searchQuery);

const selectedFolderId = ref<string | null>(null);
const selectedNoteId = ref<string | null>(null);
const expandedFolders = ref<Set<string>>(new Set());

const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  action: null as (() => void) | null,
});

const currentFolder = computed(() => {
  return selectedFolderId.value ? getFolderById(selectedFolderId.value) : undefined;
});

const currentFolderNotes = computed(() => {
  if (!selectedFolderId.value) return [];
  return getNotesByFolder(selectedFolderId.value).value;
});

const currentNote = computed(() => {
  return selectedNoteId.value ? getNoteById(selectedNoteId.value) : undefined;
});

const handleSelectFolder = (folderId: string) => {
  selectedFolderId.value = folderId;
  selectedNoteId.value = null;
  searchQuery.value = '';
};

const handleSelectNote = (noteId: string) => {
  const note = getNoteById(noteId);
  if (note) {
    selectedFolderId.value = note.folderId;
    selectedNoteId.value = noteId;
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

      if (selectedFolderId.value === folderId || deletedFolderIds.includes(selectedFolderId.value || '')) {
        selectedFolderId.value = null;
        selectedNoteId.value = null;
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
    selectedNoteId.value = note.id;
  } catch (error) {
    console.error('Не удалось создать заметку:', error);
  }
};

const handleUpdateNote = async (updates: { title?: string; content?: string }) => {
  if (!selectedNoteId.value) return;
  try {
    await updateNote(selectedNoteId.value, updates);
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
      if (selectedNoteId.value === noteId) {
        selectedNoteId.value = null;
      }
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
