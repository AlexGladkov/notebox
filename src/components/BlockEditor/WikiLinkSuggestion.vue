<template>
  <div
    v-if="visible && (filteredNotes.length > 0 || query)"
    ref="menuRef"
    class="wiki-link-suggestions"
    :style="menuStyle"
  >
    <div
      v-for="(note, index) in filteredNotes"
      :key="note.id"
      :class="['suggestion-item', { active: index === selectedIndex }]"
      @click="selectNote(note)"
      @mouseenter="selectedIndex = index"
    >
      <span class="note-icon">{{ note.icon || '📄' }}</span>
      <span class="note-title">{{ note.title || 'Без названия' }}</span>
    </div>
    <div
      v-if="query && filteredNotes.length === 0"
      :class="['suggestion-item', 'create-new', { active: selectedIndex === 0 }]"
      @click="createNewNote"
      @mouseenter="selectedIndex = 0"
    >
      <span class="note-icon">➕</span>
      <span>Создать "{{ query }}"</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Note } from '../../types';

const props = defineProps<{
  visible: boolean;
  query: string;
  notes: Note[];
  range: { from: number; to: number } | null;
}>();

const emit = defineEmits<{
  selectNote: [note: Note];
  createNote: [title: string];
}>();

const selectedIndex = ref(0);
const menuRef = ref<HTMLElement | null>(null);

// Фильтрация заметок по запросу (fuzzy search)
const filteredNotes = computed(() => {
  if (!props.query) {
    // Если запрос пустой, показываем последние заметки
    return props.notes.slice(0, 10);
  }

  const query = props.query.toLowerCase();

  return props.notes
    .filter(note => {
      const title = (note.title || '').toLowerCase();
      // Простой fuzzy search: каждый символ запроса должен встречаться по порядку
      let queryIndex = 0;
      for (let i = 0; i < title.length && queryIndex < query.length; i++) {
        if (title[i] === query[queryIndex]) {
          queryIndex++;
        }
      }
      return queryIndex === query.length;
    })
    .slice(0, 10); // Ограничиваем до 10 результатов
});

// Вычисляем позицию меню
const menuStyle = computed(() => {
  // Позиционирование будет настроено через JS после рендеринга
  return {
    position: 'fixed' as const,
    zIndex: 1000,
  };
});

// Сброс выбранного индекса при изменении списка
watch(
  () => filteredNotes.value.length,
  () => {
    selectedIndex.value = 0;
  }
);

// Обновление позиции меню при показе
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      await nextTick();
      updateMenuPosition();
    }
  }
);

const updateMenuPosition = () => {
  if (!menuRef.value) return;

  // Получаем позицию курсора из DOM
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Устанавливаем позицию меню под курсором
  menuRef.value.style.left = `${rect.left}px`;
  menuRef.value.style.top = `${rect.bottom + 5}px`;

  // Проверяем, не выходит ли меню за пределы окна
  const menuRect = menuRef.value.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    menuRef.value.style.left = `${window.innerWidth - menuRect.width - 10}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    menuRef.value.style.top = `${rect.top - menuRect.height - 5}px`;
  }
};

const selectNote = (note: Note) => {
  emit('selectNote', note);
  selectedIndex.value = 0;
};

const createNewNote = () => {
  emit('createNote', props.query);
  selectedIndex.value = 0;
};

const navigateUp = () => {
  const maxIndex = filteredNotes.value.length > 0 ? filteredNotes.value.length - 1 : 0;
  selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : maxIndex;
};

const navigateDown = () => {
  const maxIndex = filteredNotes.value.length > 0 ? filteredNotes.value.length - 1 : 0;
  selectedIndex.value = selectedIndex.value < maxIndex ? selectedIndex.value + 1 : 0;
};

const selectCurrent = () => {
  if (filteredNotes.value.length > 0) {
    selectNote(filteredNotes.value[selectedIndex.value]);
  } else if (props.query) {
    createNewNote();
  }
};

// Expose methods для вызова из родительского компонента
defineExpose({
  navigateUp,
  navigateDown,
  selectCurrent,
});
</script>

<style scoped>
.wiki-link-suggestions {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  min-width: 200px;
  max-width: 400px;
}

.dark .wiki-link-suggestions {
  background: #374151;
  border-color: #4b5563;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover,
.suggestion-item.active {
  background-color: #f3f4f6;
}

.dark .suggestion-item:hover,
.dark .suggestion-item.active {
  background-color: #4b5563;
}

.note-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.note-title {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .note-title {
  color: #e5e7eb;
}

.suggestion-item.create-new {
  color: #2563eb;
  font-weight: 500;
  border-top: 1px solid #e5e7eb;
}

.dark .suggestion-item.create-new {
  color: #60a5fa;
  border-top-color: #4b5563;
}
</style>
