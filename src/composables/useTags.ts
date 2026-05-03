import { ref } from 'vue';
import type { Tag } from '../types';
import { tagsApi } from '../api';
import { TAG_COLOR_PALETTE } from '../types/database';

export function useTags() {
  const tags = ref<Tag[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadTags = async () => {
    loading.value = true;
    error.value = null;
    try {
      tags.value = await tagsApi.getAll();
    } catch (err) {
      console.error('Failed to load tags:', err);
      error.value = 'Не удалось загрузить теги';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTag = async (name: string, color?: string): Promise<Tag> => {
    if (!name.trim()) {
      throw new Error('Имя тега не может быть пустым');
    }

    const existingTag = tags.value.find(
      t => t.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingTag) {
      return existingTag;
    }

    try {
      const tagColor = color || getNextColor();
      const newTag = await tagsApi.create({
        name: name.trim(),
        color: tagColor
      });
      tags.value.push(newTag);
      return newTag;
    } catch (err) {
      console.error('Failed to create tag:', err);
      throw err;
    }
  };

  const updateTag = async (id: string, name?: string, color?: string): Promise<Tag> => {
    try {
      const updatedTag = await tagsApi.update(id, { name, color });
      const index = tags.value.findIndex(t => t.id === id);
      if (index !== -1) {
        tags.value[index] = updatedTag;
      }
      return updatedTag;
    } catch (err) {
      console.error('Failed to update tag:', err);
      throw err;
    }
  };

  const deleteTag = async (id: string) => {
    try {
      await tagsApi.delete(id);
      tags.value = tags.value.filter(t => t.id !== id);
    } catch (err) {
      console.error('Failed to delete tag:', err);
      throw err;
    }
  };

  const setNoteTags = async (noteId: string, tagIds: string[]) => {
    try {
      await tagsApi.setNoteTags(noteId, tagIds);
    } catch (err) {
      console.error('Failed to set note tags:', err);
      throw err;
    }
  };

  const getNextColor = (): string => {
    const colorPalette = TAG_COLOR_PALETTE.map(c => c.light);
    const nextColorIndex = tags.value.length % colorPalette.length;
    return colorPalette[nextColorIndex];
  };

  const findOrCreateTag = async (name: string): Promise<Tag> => {
    const existingTag = tags.value.find(
      t => t.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingTag) {
      return existingTag;
    }

    return createTag(name);
  };

  return {
    tags,
    loading,
    error,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    setNoteTags,
    findOrCreateTag,
  };
}
