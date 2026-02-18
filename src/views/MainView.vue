<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <DemoBanner v-if="isDemoUser" />
    <div class="flex flex-1 overflow-hidden">
      <!-- Единая левая панель с деревом страниц -->
      <div class="flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full" style="width: 288px;">
        <!-- User Profile -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <UserProfile v-if="user" :user="user" @click="showProfileModal = true" />
        </div>

        <!-- Поиск -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <SearchBar v-model="searchQuery" />
        </div>

        <!-- Список страниц -->
        <div class="flex-1 overflow-y-auto p-2">
          <!-- Результаты поиска -->
          <div v-if="searchQuery" class="space-y-1">
            <div
              v-for="note in searchResults"
              :key="note.id"
              @click="handleSelectNote(note.id)"
              :class="[
                'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md',
                { 'bg-blue-50 dark:bg-blue-900': activeNoteId === note.id }
              ]"
            >
              <div class="flex items-center gap-2">
                <span v-if="note.icon" class="text-sm">{{ note.icon }}</span>
                <div class="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
                  {{ note.title || 'Без названия' }}
                </div>
              </div>
            </div>
            <div v-if="searchResults.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Ничего не найдено
            </div>
          </div>

          <!-- Древовидный список всех страниц -->
          <div v-else>
            <div class="flex items-center justify-between px-3 py-2">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Страницы</span>
              <button
                @click="handleCreateRootPage"
                class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
                title="Создать страницу"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <NoteTree
              v-if="rootNotes.length > 0"
              :notes="rootNotes"
              :all-notes="notes"
              :selected-note-id="activeNoteId"
              :expanded-notes="expandedNotes"
              @select-note="(id, forceNewTab) => handleSelectNote(id, forceNewTab)"
              @create-subpage="handleCreateSubpage"
              @toggle-expand="toggleExpandNote"
            />

            <div v-else class="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Создайте первую страницу
            </div>
          </div>
        </div>

        <!-- Переключатель темы -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="cycleTheme"
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            :title="themeTooltip"
            aria-label="Переключить тему"
          >
            <svg
              v-if="themeMode === 'light'"
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <svg
              v-else-if="themeMode === 'dark'"
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ themeTooltip }}</span>
          </button>
        </div>
      </div>

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

    <ProfileModal
      v-if="user"
      :is-open="showProfileModal"
      :user="user"
      @close="showProfileModal = false"
      @logout="handleLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useStorage } from '../composables/useStorage';
import { useNotes } from '../composables/useNotes';
import { useSearch } from '../composables/useSearch';
import { useTheme } from '../composables/useTheme';
import { useTabs } from '../composables/useTabs';
import { useAuth } from '../composables/useAuth';
import SearchBar from '../components/SearchBar.vue';
import NoteTree from '../components/NoteTree.vue';
import NoteEditor from '../components/NoteEditor.vue';
import TabBar from '../components/TabBar.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import UserProfile from '../components/auth/UserProfile.vue';
import ProfileModal from '../components/auth/ProfileModal.vue';
import DemoBanner from '../components/layout/DemoBanner.vue';

// Auth
const { user, logout, isDemoUser } = useAuth();
const showProfileModal = ref(false);

// Инициализация темы
const { themeMode, cycleTheme } = useTheme();

const themeTooltip = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return 'Светлая тема';
    case 'dark':
      return 'Тёмная тема';
    case 'system':
      return 'Системная тема';
    default:
      return 'Переключить тему';
  }
});

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
  action: null as (() => void) | null,
});

const activeNoteId = computed(() => activeTabId.value);
const currentNote = computed(() => getActiveNote());

const rootNotes = computed(() =>
  notes.value.filter(n => !n.parentId)
    .sort((a, b) => a.title.localeCompare(b.title))
);

function handleSelectNote(noteId: string, forceNewTab = false) {
  const note = getNoteById(noteId);
  if (note) {
    openTab(note, forceNewTab);
    expandAllAncestors(noteId);
  }
}

async function handleCreateRootPage() {
  try {
    const newNote = await createNote('Новая страница', null);
    openTab(newNote.id);
  } catch (error) {
    console.error('Не удалось создать страницу:', error);
  }
}

async function handleCreateSubpage(parentId: string) {
  try {
    const newNote = await createNote('Новая страница', parentId);
    expandAllAncestors(newNote.id);
    openTab(newNote.id);
  } catch (error) {
    console.error('Не удалось создать подстраницу:', error);
  }
}

async function handleUpdateNote(updatedNote: { id: string; title?: string; content?: string }) {
  try {
    await updateNote(updatedNote.id, {
      title: updatedNote.title,
      content: updatedNote.content,
    });
    if (updatedNote.title !== undefined) {
      updateTabTitle(updatedNote.id, updatedNote.title);
    }
  } catch (error) {
    console.error('Не удалось обновить заметку:', error);
  }
}

function toggleExpandNote(noteId: string) {
  toggleNoteExpanded(noteId);
}

function handleConfirmAction() {
  if (confirmDialog.action) {
    confirmDialog.action();
  }
  confirmDialog.show = false;
  confirmDialog.action = null;
}

function cancelConfirm() {
  confirmDialog.show = false;
  confirmDialog.action = null;
}

async function handleLogout() {
  await logout();
}
</script>

<style scoped>
/* Стили уже определены в Tailwind классах */
</style>
