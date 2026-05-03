<template>
  <div class="note-tags">
    <!-- Отображение выбранных тегов -->
    <div v-if="selectedTags.length > 0" class="tags-display">
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="tag"
        :style="{ backgroundColor: tag.color }"
        @click.stop="removeTag(tag.id)"
      >
        {{ tag.name }}
        <span class="remove-icon">×</span>
      </span>
    </div>

    <!-- Кнопка добавления тега -->
    <button
      v-if="!menuVisible"
      class="add-tag-button"
      @click="openMenu"
    >
      <span class="add-icon">+</span>
      <span>Добавить тег</span>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="tags-menu"
      @click.stop
    >
      <input
        v-model="searchQuery"
        ref="searchInput"
        class="menu-search"
        placeholder="Поиск или создать..."
        @keydown.enter="createAndAddTag"
        @keydown.esc="closeMenu"
      />

      <div class="menu-options">
        <div
          v-for="tag in filteredTags"
          :key="tag.id"
          class="menu-option"
          :class="{ active: isSelected(tag.id) }"
          @click="toggleTag(tag.id)"
        >
          <input
            type="checkbox"
            :checked="isSelected(tag.id)"
            class="option-checkbox"
            @click.stop
          />
          <span class="option-tag" :style="{ backgroundColor: tag.color }">
            {{ tag.name }}
          </span>
        </div>

        <div
          v-if="searchQuery && !exactMatchExists"
          class="menu-option create"
          @click="createAndAddTag"
        >
          <span class="create-icon">+</span>
          <span>Создать "{{ searchQuery }}"</span>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="menuVisible"
      class="menu-overlay"
      @click="closeMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { Tag } from '../types';

const props = defineProps<{
  selectedTagIds: string[];
  availableTags: Tag[];
}>();

const emit = defineEmits<{
  addTag: [tagId: string];
  removeTag: [tagId: string];
  createTag: [name: string];
}>();

const menuVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const selectedTags = computed(() => {
  return props.availableTags.filter(tag => props.selectedTagIds.includes(tag.id));
});

const filteredTags = computed(() => {
  if (!searchQuery.value) {
    return props.availableTags;
  }
  const query = searchQuery.value.toLowerCase();
  return props.availableTags.filter(tag => tag.name.toLowerCase().includes(query));
});

const exactMatchExists = computed(() => {
  return props.availableTags.some(
    tag => tag.name.toLowerCase() === searchQuery.value.toLowerCase()
  );
});

const isSelected = (tagId: string) => {
  return props.selectedTagIds.includes(tagId);
};

const openMenu = async () => {
  menuVisible.value = true;
  searchQuery.value = '';
  await nextTick();
  searchInput.value?.focus();
};

const closeMenu = () => {
  menuVisible.value = false;
  searchQuery.value = '';
};

const toggleTag = (tagId: string) => {
  if (isSelected(tagId)) {
    emit('removeTag', tagId);
  } else {
    emit('addTag', tagId);
  }
};

const removeTag = (tagId: string) => {
  emit('removeTag', tagId);
};

const createAndAddTag = () => {
  if (!searchQuery.value.trim()) return;

  const trimmedName = searchQuery.value.trim();

  // Проверяем, существует ли уже тег с таким именем
  const existingTag = props.availableTags.find(
    tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (existingTag) {
    // Если тег существует, просто добавляем его
    if (!isSelected(existingTag.id)) {
      emit('addTag', existingTag.id);
    }
  } else {
    // Создаем новый тег
    emit('createTag', trimmedName);
  }

  searchQuery.value = '';
};
</script>

<style scoped>
.note-tags {
  position: relative;
  margin-top: 8px;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.tag:hover {
  opacity: 0.8;
}

.dark .tag {
  color: #e5e7eb;
}

.remove-icon {
  font-size: 18px;
  line-height: 1;
  opacity: 0.6;
}

.tag:hover .remove-icon {
  opacity: 1;
}

.add-tag-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #6b7280;
  background: transparent;
  border: 1px dashed #d1d5db;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-tag-button:hover {
  color: #374151;
  border-color: #9ca3af;
  background: #f9fafb;
}

.dark .add-tag-button {
  color: #9ca3af;
  border-color: #4b5563;
}

.dark .add-tag-button:hover {
  color: #e5e7eb;
  border-color: #6b7280;
  background: #1f2937;
}

.add-icon {
  font-size: 16px;
  font-weight: 600;
}

/* Menu Styles */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.tags-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  max-width: 350px;
}

.dark .tags-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.menu-search {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  padding: 10px 12px;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: #111827;
}

.dark .menu-search {
  border-bottom-color: #374151;
  color: #f3f4f6;
}

.menu-search::placeholder {
  color: #9ca3af;
}

.dark .menu-search::placeholder {
  color: #6b7280;
}

.menu-options {
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
}

.menu-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.menu-option:hover {
  background: #f3f4f6;
}

.dark .menu-option:hover {
  background: #374151;
}

.menu-option.active {
  background: #eff6ff;
}

.dark .menu-option.active {
  background: #1e3a5f;
}

.menu-option.create {
  color: #3b82f6;
  font-weight: 500;
}

.dark .menu-option.create {
  color: #60a5fa;
}

.option-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.option-tag {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
}

.dark .option-tag {
  color: #e5e7eb;
}

.create-icon {
  font-size: 18px;
  font-weight: 600;
}
</style>
