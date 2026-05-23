import { computed, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotesStore } from '../stores/notesStore';

export function useSearch(searchQuery: Ref<string>) {
  const notesStore = useNotesStore();
  const { notes } = storeToRefs(notesStore);

  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) {
      return [];
    }

    const query = searchQuery.value.toLowerCase();
    return notes.value.filter(note =>
      note.title.toLowerCase().includes(query) ||
      (note.content?.toLowerCase().includes(query) ?? false)
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  });

  return {
    searchResults,
  };
}
