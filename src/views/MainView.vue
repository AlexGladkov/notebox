<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <DemoBanner v-if="isDemoUser" />
    <!-- Индикатор синхронизации -->
    <div class="sync-status-bar">
      <SyncStatusIndicator />
    </div>
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

          <!-- Фильтр по тегам -->
          <div v-if="tags.length > 0" class="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <TagFilter
              :tags="tags"
              :selected-tag-ids="selectedTagIds"
              @toggle-tag="toggleTagFilter"
              @clear-filter="clearTagFilter"
            />
          </div>
        </div>

        <!-- Кнопки управления -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <!-- Кнопка графа -->
          <button
            @click="openGraph"
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Граф связей страниц"
            aria-label="Открыть граф связей"
          >
            <svg
              class="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span class="text-sm text-gray-700 dark:text-gray-300">Граф связей</span>
          </button>

          <!-- Переключатель темы -->
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
            :available-tags="tags"
            @update-note="handleUpdateNote"
            @note-created="handleNoteCreated"
            @navigate-to-note="handleSelectNote"
            @add-tag="handleAddTag"
            @remove-tag="handleRemoveTag"
            @create-tag="handleCreateTag"
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

    <SettingsModal
      v-if="user"
      :is-open="showProfileModal"
      :user="user"
      @close="showProfileModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '../composables/useStorage';
import { useNotes } from '../composables/useNotes';
import { useSearch } from '../composables/useSearch';
import { useTheme } from '../composables/useTheme';
import { useTabs } from '../composables/useTabs';
import { useAuth } from '../composables/useAuth';
import { useTags } from '../composables/useTags';
import { notesApi } from '../api/notes';
import SearchBar from '../components/SearchBar.vue';
import NoteTree from '../components/NoteTree.vue';
import NoteEditor from '../components/NoteEditor.vue';
import TabBar from '../components/TabBar.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import UserProfile from '../components/auth/UserProfile.vue';
import SettingsModal from '../components/settings/SettingsModal.vue';
import DemoBanner from '../components/layout/DemoBanner.vue';
import TagFilter from '../components/TagFilter.vue';
import SyncStatusIndicator from '../components/SyncStatusIndicator.vue';

// Router
const router = useRouter();

// Auth
const { user, logout, isDemoUser } = useAuth();
const showProfileModal = ref(false);

// Переключатель темы
const { themeMode, cycleTheme } = useTheme();

// Функция открытия графа
const openGraph = () => {
  router.push('/graph');
};

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

// Теги
const {
  tags,
  loadTags,
  createTag,
  setNoteTags,
  findOrCreateTag,
} = useTags();

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

// Фильтр по тегам
const selectedTagIds = ref<string[]>([]);

const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  action: null as (() => void) | null,
});

const activeNoteId = computed(() => activeTabId.value);
const currentNote = computed(() => getActiveNote());

const rootNotes = computed(() => {
  let filtered = notes.value.filter(n => !n.parentId);

  // Фильтрация по тегам (OR логика - показать заметки с любым из выбранных тегов)
  if (selectedTagIds.value.length > 0) {
    filtered = filtered.filter(note => {
      if (!note.tags || note.tags.length === 0) return false;
      return note.tags.some(tag => selectedTagIds.value.includes(tag.id));
    });
  }

  return filtered.sort((a, b) => a.title.localeCompare(b.title));
});

function handleSelectNote(noteId: string, forceNewTab = false) {
  const note = getNoteById(noteId);
  if (note) {
    openTab(noteId, forceNewTab);
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

async function handleUpdateNote(updates: {
  title?: string;
  content?: string;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
}) {
  if (!currentNote.value) return;

  try {
    await updateNote(currentNote.value.id, updates);
    if (updates.title !== undefined) {
      updateTabTitle(currentNote.value.id, updates.title);
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

async function handleNoteCreated(noteId: string) {
  try {
    // Fetch the created note and add it to the notes list
    const createdNote = await notesApi.getById(noteId);

    // Check if note already exists to avoid duplicates
    const existingIndex = notes.value.findIndex(n => n.id === createdNote.id);
    if (existingIndex !== -1) {
      // Update existing note instead of adding duplicate
      notes.value[existingIndex] = createdNote;
    } else {
      notes.value.push(createdNote);
    }

    // Expand ancestors to show the new note in the tree
    expandAllAncestors(createdNote.id);
  } catch (error) {
    console.error('Failed to fetch created note:', error);
  }
}

async function handleAddTag(tagId: string) {
  if (!currentNote.value) return;

  try {
    const currentTagIds = currentNote.value.tags?.map(t => t.id) || [];
    const newTagIds = [...currentTagIds, tagId];
    await setNoteTags(currentNote.value.id, newTagIds);

    // Обновляем локальную копию заметки
    const updatedNote = await notesApi.getById(currentNote.value.id);
    const index = notes.value.findIndex(n => n.id === currentNote.value!.id);
    if (index !== -1) {
      notes.value[index] = updatedNote;
    }
  } catch (error) {
    console.error('Не удалось добавить тег:', error);
  }
}

async function handleRemoveTag(tagId: string) {
  if (!currentNote.value) return;

  try {
    const currentTagIds = currentNote.value.tags?.map(t => t.id) || [];
    const newTagIds = currentTagIds.filter(id => id !== tagId);
    await setNoteTags(currentNote.value.id, newTagIds);

    // Обновляем локальную копию заметки
    const updatedNote = await notesApi.getById(currentNote.value.id);
    const index = notes.value.findIndex(n => n.id === currentNote.value!.id);
    if (index !== -1) {
      notes.value[index] = updatedNote;
    }
  } catch (error) {
    console.error('Не удалось удалить тег:', error);
  }
}

async function handleCreateTag(name: string) {
  if (!currentNote.value) return;

  try {
    const newTag = await findOrCreateTag(name);
    const currentTagIds = currentNote.value.tags?.map(t => t.id) || [];
    const newTagIds = [...currentTagIds, newTag.id];
    await setNoteTags(currentNote.value.id, newTagIds);

    // Обновляем локальную копию заметки
    const updatedNote = await notesApi.getById(currentNote.value.id);
    const index = notes.value.findIndex(n => n.id === currentNote.value!.id);
    if (index !== -1) {
      notes.value[index] = updatedNote;
    }
  } catch (error) {
    console.error('Не удалось создать тег:', error);
  }
}

function toggleTagFilter(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId);
  if (index > -1) {
    selectedTagIds.value.splice(index, 1);
  } else {
    selectedTagIds.value.push(tagId);
  }
}

function clearTagFilter() {
  selectedTagIds.value = [];
}

// Загрузка тегов при монтировании
onMounted(async () => {
  try {
    await loadTags();
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
});
</script>

<style scoped>
/* Стили уже определены в Tailwind классах */

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
