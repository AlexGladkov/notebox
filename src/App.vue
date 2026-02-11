<template>
  <div class="flex h-screen overflow-hidden">
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
      <div v-if="selectedFolderId && !selectedNoteId" class="w-80 border-r border-gray-200">
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
import Sidebar from './components/Sidebar.vue';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

const { folders, notes } = useStorage();
const {
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderById,
  getRootFolders,
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

const handleCreateRootFolder = () => {
  const folder = createFolder('Новая папка', null);
  selectedFolderId.value = folder.id;
  selectedNoteId.value = null;
  expandedFolders.value.add(folder.id);
};

const handleCreateSubfolder = (parentId: string) => {
  const folder = createFolder('Новая папка', parentId);
  expandedFolders.value.add(parentId);
  expandedFolders.value.add(folder.id);
};

const handleRenameFolder = (folderId: string, name: string) => {
  updateFolder(folderId, name);
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
  confirmDialog.action = () => {
    const deletedFolderIds = deleteFolder(folderId);
    deleteNotesByFolderIds(deletedFolderIds);

    if (selectedFolderId.value === folderId || deletedFolderIds.includes(selectedFolderId.value || '')) {
      selectedFolderId.value = null;
      selectedNoteId.value = null;
    }

    deletedFolderIds.forEach(id => expandedFolders.value.delete(id));
  };
};

const handleCreateNote = () => {
  if (!selectedFolderId.value) return;

  const note = createNote('Новая заметка', selectedFolderId.value);
  selectedNoteId.value = note.id;
};

const handleUpdateNote = (updates: { title?: string; content?: string }) => {
  if (!selectedNoteId.value) return;
  updateNote(selectedNoteId.value, updates);
};

const handleDeleteNote = (noteId: string) => {
  const note = getNoteById(noteId);
  if (!note) return;

  confirmDialog.show = true;
  confirmDialog.title = 'Удалить заметку?';
  confirmDialog.message = `Вы уверены, что хотите удалить заметку "${note.title}"?`;
  confirmDialog.action = () => {
    deleteNote(noteId);
    if (selectedNoteId.value === noteId) {
      selectedNoteId.value = null;
    }
  };
};

const handleConfirmAction = () => {
  if (confirmDialog.action) {
    confirmDialog.action();
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
