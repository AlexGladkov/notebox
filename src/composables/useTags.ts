import { storeToRefs } from 'pinia';
import type { Tag } from '../types';
import { useTagsStore } from '../stores/tagsStore';

export function useTags() {
  const store = useTagsStore();
  const { tags, loading, error } = storeToRefs(store);

  const findOrCreateTag = async (name: string): Promise<Tag> => {
    const existingTag = store.getTagById(name);
    if (existingTag) {
      return existingTag;
    }
    return store.createTag(name);
  };

  return {
    tags,
    loading,
    error,
    loadTags: store.loadTags,
    createTag: store.createTag,
    updateTag: store.updateTag,
    deleteTag: store.deleteTag,
    setNoteTags: store.setNoteTags,
    findOrCreateTag,
    getTagColors: store.getTagColors,
  };
}
