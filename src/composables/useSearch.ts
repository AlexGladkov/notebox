import { computed, type Ref } from 'vue';
import type { Note } from '../types';

export function useSearch(notes: Ref<Note[]>, searchQuery: Ref<string>) {
  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) {
      return [];
    }

    const query = searchQuery.value.toLowerCase();
    return notes.value.filter(note =>
      note.title.toLowerCase().includes(query)
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  });

  return {
    searchResults,
  };
}
