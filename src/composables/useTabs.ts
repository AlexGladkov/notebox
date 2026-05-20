import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { Note } from '../types';
import { useNotesStore } from '../stores/notesStore';
import { useUIStore } from '../stores/uiStore';

export type { Tab } from '../stores/uiStore';

export function useTabs() {
  const uiStore = useUIStore();
  const notesStore = useNotesStore();
  const { tabs, activeTabId } = storeToRefs(uiStore);

  const openTab = (noteId: string, forceNew: boolean = false): void => {
    const note = notesStore.getNoteById(noteId);
    if (note) {
      uiStore.openTab(noteId, note.title, forceNew);
    }
  };

  const getActiveNote = (): Note | undefined => {
    const tab = uiStore.activeTab;
    if (!tab) return undefined;

    const note = notesStore.getNoteById(tab.noteId);

    // Если заметка была удалена, закрываем вкладку
    if (!note) {
      uiStore.closeTab(tab.id);
      return undefined;
    }

    return note;
  };

  const removeTabsByFolderIds = (folderIds: string[]): void => {
    tabs.value
      .filter(tab => {
        const note = notesStore.getNoteById(tab.noteId);
        return note && note.parentId && folderIds.includes(note.parentId);
      })
      .forEach(tab => uiStore.closeTab(tab.id));
  };

  const getTabIndex = (tabId: string): number => {
    return tabs.value.findIndex(t => t.id === tabId);
  };

  return {
    tabs: computed(() => tabs.value),
    activeTabId: computed(() => activeTabId.value),
    openTab,
    closeTab: uiStore.closeTab,
    closeOtherTabs: uiStore.closeOtherTabs,
    closeAllTabs: uiStore.closeAllTabs,
    setActiveTab: uiStore.setActiveTab,
    moveTab: uiStore.moveTab,
    getActiveNote,
    updateTabTitle: uiStore.updateTabTitle,
    removeTabsByNoteId: uiStore.removeTabsByNoteId,
    removeTabsByFolderIds,
    getTabIndex,
  };
}
