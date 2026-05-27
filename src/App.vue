<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <!-- Индикатор синхронизации -->
    <div class="sync-status-bar">
      <SyncStatusIndicator />
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Единая левая панель с деревом страниц -->
      <UnifiedSidebar
        :all-notes="notes"
        :search-query="searchQuery"
        :selected-note-id="activeNoteId"
        :expanded-notes="expandedNotes"
        :search-results="searchResults"
        :create-note-fn="handleCreateNoteForImport"
        :update-note-fn="handleUpdateNoteForImport"
        @update:search-query="searchQuery = $event"
        @select-note="handleSelectNote"
        @create-root-page="handleCreateRootPage"
        @create-subpage="handleCreateSubpage"
        @toggle-expand="toggleExpandNote"
        @notes-imported="handleNotesImported"
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
            :available-tags="[]"
            @update-note="handleUpdateNote"
            @note-created="() => {}"
            @navigate-to-note="handleSelectNote"
            @add-tag="() => {}"
            @remove-tag="() => {}"
            @create-tag="() => {}"
            @create-from-template="handleCreateFromTemplate"
          />
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :details="confirmDialog.details"
      :confirm-label="confirmDialog.confirmLabel"
      :confirm-variant="confirmDialog.confirmVariant"
      @confirm="handleConfirmAction"
      @cancel="cancelConfirm"
    />

    <!-- PWA Components -->
    <PWAInstallPrompt
      :can-install="canInstall"
      :is-installed="isInstalled"
      @install="handlePWAInstall"
    />
    <PWAUpdatePrompt
      :need-refresh="needRefresh"
      @update="handlePWAUpdate"
      @dismiss="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotesStore } from './stores/notesStore';
import { useStorage } from './composables/useStorage';
import { useNotes } from './composables/useNotes';
import { useSearch } from './composables/useSearch';
import { useTheme } from './composables/useTheme';
import { useTabs } from './composables/useTabs';
import { usePWA } from './composables/usePWA';
import { initNetworkStatus, destroyNetworkStatus, useNetworkStatus } from './services/offline/networkStatus';
import { offlineStore } from './services/offline/offlineStore';
import { notesApi } from './api/notes';
import UnifiedSidebar from './components/UnifiedSidebar.vue';
import NoteEditor from './components/NoteEditor.vue';
import TabBar from './components/TabBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import SyncStatusIndicator from './components/SyncStatusIndicator.vue';
import PWAInstallPrompt from './components/PWAInstallPrompt.vue';
import PWAUpdatePrompt from './components/PWAUpdatePrompt.vue';

// Инициализация темы
const { initialize: initializeTheme } = useTheme();
initializeTheme();

// Notes Store
const notesStore = useNotesStore();
const { notes, expandedNotes } = storeToRefs(notesStore);
const { loadNotes } = useStorage();
const { isOnline } = useNetworkStatus();

// PWA
const { canInstall, isInstalled, needRefresh, install, updateServiceWorker } = usePWA();

const handlePWAInstall = async () => {
  await install();
};

const handlePWAUpdate = () => {
  updateServiceWorker();
};

// Инициализация отслеживания состояния сети
onMounted(async () => {
  initNetworkStatus();

  // Инициализация offlineStore с network status после initNetworkStatus
  offlineStore.setNetworkStatusGetter(() => isOnline.value);

  // Загружаем заметки
  await loadNotes();

  // Слушаем сообщения от Service Worker для навигации (push-уведомления)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        const url = event.data.url;
        // Извлекаем ID заметки из URL
        const match = url.match(/\/notes\/([a-f0-9-]+)/);
        if (match && match[1]) {
          handleSelectNote(match[1]);
        }
      }
    });
  }
});

onUnmounted(() => {
  destroyNetworkStatus();
});

const {
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
  getAllDescendants: _getAllDescendants,
  getChildrenCount: _getChildrenCount,
  toggleNoteExpanded,
  expandAllAncestors,
} = useNotes();

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
} = useTabs();

const searchQuery = ref('');
const { searchResults } = useSearch(searchQuery);

const confirmDialog = reactive<{
  show: boolean;
  title: string;
  message: string;
  action: (() => void | Promise<void>) | null;
  details?: {
    childrenCount?: number;
    itemsList?: string[];
  };
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning';
}>({
  show: false,
  title: '',
  message: '',
  action: null,
  details: undefined,
  confirmLabel: undefined,
  confirmVariant: undefined,
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


const _showDeleteNoteWithChildrenDialog = (noteId: string, childrenCount: number) => {
  const note = getNoteById(noteId);
  if (!note) return;

  // Получаем всех потомков для отображения в списке
  const descendants = getAllDescendants(noteId);
  const childrenTitles = descendants.map(n => n.title || 'Без названия');

  confirmDialog.show = true;
  confirmDialog.title = 'Удалить страницу с вложенными страницами?';
  confirmDialog.message = `Вы собираетесь удалить страницу "${note.title}".`;
  confirmDialog.details = {
    childrenCount,
    itemsList: childrenTitles,
  };
  confirmDialog.confirmLabel = 'Удалить всё';
  confirmDialog.confirmVariant = 'danger';
  confirmDialog.action = async () => {
    try {
      // Получаем все ID заметок, которые будут удалены (включая потомков)
      const allNoteIds = [noteId, ...descendants.map(n => n.id)];

      await deleteNote(noteId, true); // cascade delete

      // Закрываем вкладки всех удаленных заметок
      allNoteIds.forEach(id => removeTabsByNoteId(id));
    } catch (error) {
      console.error('Не удалось удалить заметку:', error);
    }
  };
};

const handleCreateFromTemplate = async (data: { title: string; content: string; icon: string }) => {
  try {
    const newNote = await createNote(data.title, null);

    await updateNote(newNote.id, {
      content: data.content,
      icon: data.icon,
    });

    // Получить обновленную заметку для синхронизации состояния
    const updatedNote = await notesApi.getById(newNote.id);

    // Обновить заметку в локальном состоянии
    const noteIndex = notes.value.findIndex(n => n.id === newNote.id);
    if (noteIndex !== -1) {
      notes.value[noteIndex] = updatedNote;
    } else {
      notes.value.unshift(updatedNote);
    }

    openTab(newNote.id);
  } catch (error) {
    console.error('Не удалось создать заметку из шаблона:', error);
  }
};

// Обработчики для импорта
const handleCreateNoteForImport = async (data: {
  title: string;
  content: string;
  parentId?: string | null;
  icon?: string | null;
}): Promise<Note> => {
  const note = await notesStore.createNote({
    title: data.title,
    content: data.content,
    parentId: data.parentId,
    icon: data.icon,
  });
  return note;
};

const handleUpdateNoteForImport = async (id: string, updates: Partial<Note>): Promise<void> => {
  await updateNote(id, updates);
};

const handleNotesImported = async (importedNotes: Note[]) => {
  // Заметки уже добавлены в store через createNote
  // Просто обновляем UI и открываем первую заметку
  if (importedNotes.length > 0) {
    // Открываем первую импортированную заметку (обычно это корневая папка или первый файл)
    const firstNote = importedNotes[0];
    openTab(firstNote.id, false);
  }
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
  confirmDialog.details = undefined;
  confirmDialog.confirmLabel = undefined;
  confirmDialog.confirmVariant = undefined;
};
</script>

<style scoped>
.sync-status-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 4px 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.dark .sync-status-bar {
  background-color: #1f2937;
  border-bottom-color: #374151;
}
</style>
