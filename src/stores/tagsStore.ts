import { defineStore } from 'pinia';
import type { Tag } from '../types';
import { tagsApi } from '../api';
import { TAG_COLOR_PALETTE } from '../types/database';

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [] as Tag[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getTagById: (state) => (id: string) => state.tags.find(t => t.id === id),
    getNextColor: (state) => () => {
      const nextColorIndex = state.tags.length % TAG_COLOR_PALETTE.length;
      return TAG_COLOR_PALETTE[nextColorIndex].name;
    },
  },

  actions: {
    async loadTags(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.tags = await tagsApi.getAll();
      } catch (err) {
        console.error('Failed to load tags:', err);
        this.error = 'Не удалось загрузить теги';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async createTag(name: string, color?: string): Promise<Tag> {
      if (!name.trim()) {
        throw new Error('Имя тега не может быть пустым');
      }

      const existingTag = this.tags.find(
        t => t.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (existingTag) {
        return existingTag;
      }

      try {
        const tagColor = color || this.getNextColor();
        const newTag = await tagsApi.create({
          name: name.trim(),
          color: tagColor
        });
        this.tags.push(newTag);
        return newTag;
      } catch (err) {
        console.error('Failed to create tag:', err);
        throw err;
      }
    },

    async updateTag(id: string, name?: string, color?: string): Promise<Tag> {
      try {
        const updatedTag = await tagsApi.update(id, { name, color });
        const index = this.tags.findIndex(t => t.id === id);
        if (index !== -1) {
          this.tags[index] = updatedTag;
        }
        return updatedTag;
      } catch (err) {
        console.error('Failed to update tag:', err);
        throw err;
      }
    },

    async deleteTag(id: string): Promise<void> {
      try {
        await tagsApi.delete(id);
        this.tags = this.tags.filter(t => t.id !== id);
      } catch (err) {
        console.error('Failed to delete tag:', err);
        throw err;
      }
    },

    async setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
      try {
        await tagsApi.setNoteTags(noteId, tagIds);
      } catch (err) {
        console.error('Failed to set note tags:', err);
        throw err;
      }
    },

    getColorNameFromHex(hex: string): string {
      const normalizedHex = hex.toLowerCase().trim();
      const color = TAG_COLOR_PALETTE.find(
        c => c.light.toLowerCase() === normalizedHex || c.dark.toLowerCase() === normalizedHex
      );
      return color ? color.name : 'gray';
    },

    getTagColors(colorNameOrHex: string, isDark: boolean): { background: string; text: string } {
      let colorName = colorNameOrHex;

      // Если передан hex-код, конвертируем в имя цвета (для обратной совместимости)
      if (colorNameOrHex.startsWith('#')) {
        colorName = this.getColorNameFromHex(colorNameOrHex);
      }

      const palette = TAG_COLOR_PALETTE.find(c => c.name === colorName) || TAG_COLOR_PALETTE[0];
      return {
        background: isDark ? palette.dark : palette.light,
        text: isDark ? '#ffffff' : palette.text
      };
    },
  },
});
