import { ref } from 'vue';
import type { Tag } from '../types';
import { tagsApi } from '../api';
import { TAG_COLOR_PALETTE } from '../types/database';

export function useTags() {
  const tags = ref<Tag[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadTags = async (): Promise<void> => {
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

  const deleteTag = async (id: string): Promise<void> => {
    try {
      await tagsApi.delete(id);
      tags.value = tags.value.filter(t => t.id !== id);
    } catch (err) {
      console.error('Failed to delete tag:', err);
      throw err;
    }
  };

  const setNoteTags = async (noteId: string, tagIds: string[]): Promise<void> => {
    try {
      await tagsApi.setNoteTags(noteId, tagIds);
    } catch (err) {
      console.error('Failed to set note tags:', err);
      throw err;
    }
  };

  const getNextColor = (): string => {
    const nextColorIndex = tags.value.length % TAG_COLOR_PALETTE.length;
    return TAG_COLOR_PALETTE[nextColorIndex].name;
  };

  const getColorNameFromHex = (hex: string): string => {
    const normalizedHex = hex.toLowerCase().trim();
    const color = TAG_COLOR_PALETTE.find(
      c => c.light.toLowerCase() === normalizedHex || c.dark.toLowerCase() === normalizedHex
    );
    return color ? color.name : 'gray';
  };

  const getTagColors = (colorNameOrHex: string, isDark: boolean): { background: string; text: string } => {
    let colorName = colorNameOrHex;

    // Если передан hex-код, конвертируем в имя цвета (для обратной совместимости)
    if (colorNameOrHex.startsWith('#')) {
      colorName = getColorNameFromHex(colorNameOrHex);
    }

    const palette = TAG_COLOR_PALETTE.find(c => c.name === colorName) || TAG_COLOR_PALETTE[0];
    return {
      background: isDark ? palette.dark : palette.light,
      text: isDark ? '#ffffff' : palette.text
    };
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
    getTagColors,
  };
}
