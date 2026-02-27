<template>
  <div class="relation-cell" @click="openPicker">
    <div v-if="selectedNote" class="relation-link">
      📄 {{ selectedNote.title }}
    </div>
    <span v-else class="cell-value empty">Выбрать заметку</span>

    <!-- Note Picker Modal (simplified) -->
    <div v-if="pickerVisible" class="picker-modal" @click.stop>
      <div class="picker-content">
        <div class="picker-header">
          <span>Выберите заметку</span>
          <button class="picker-close" @click="closePicker">×</button>
        </div>
        <input
          v-model="searchQuery"
          class="picker-search"
          placeholder="Поиск заметок..."
          ref="searchInput"
        />
        <div class="picker-list">
          <div
            v-for="note in filteredNotes"
            :key="note.id"
            class="picker-item"
            @click="selectNote(note.id)"
          >
            📄 {{ note.title }}
          </div>
          <div v-if="filteredNotes.length === 0" class="picker-empty">
            Заметки не найдены
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="pickerVisible"
      class="picker-overlay"
      @click="closePicker"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { notesApi } from '../../../api/notes';
import type { Note } from '../../../types';

const props = defineProps<{
  value: string | null; // note ID
}>();

const emit = defineEmits<{
  update: [value: string | null];
}>();

const pickerVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const notes = ref<Note[]>([]);
const selectedNote = ref<Note | null>(null);

const filteredNotes = computed(() => {
  if (!searchQuery.value) {
    return notes.value;
  }
  const query = searchQuery.value.toLowerCase();
  return notes.value.filter(note => note.title.toLowerCase().includes(query));
});

const loadNotes = async () => {
  try {
    notes.value = await notesApi.getAll();
    if (props.value) {
      selectedNote.value = notes.value.find(n => n.id === props.value) || null;
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
};

const openPicker = async () => {
  pickerVisible.value = true;
  searchQuery.value = '';
  await nextTick();
  searchInput.value?.focus();
};

const closePicker = () => {
  pickerVisible.value = false;
  searchQuery.value = '';
};

const selectNote = (noteId: string) => {
  emit('update', noteId);
  selectedNote.value = notes.value.find(n => n.id === noteId) || null;
  closePicker();
};

onMounted(() => {
  loadNotes();
});
</script>

<style scoped>
.relation-cell {
  width: 100%;
  min-height: 20px;
  cursor: pointer;
  position: relative;
}

.relation-link {
  color: #3b82f6;
  text-decoration: underline;
}

.cell-value.empty {
  color: #d1d5db;
}

/* Picker Modal */
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.picker-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
}

.picker-content {
  display: flex;
  flex-direction: column;
  max-height: 500px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
}

.picker-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
  width: 24px;
  height: 24px;
}

.picker-close:hover {
  color: #374151;
}

.picker-search {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 20px;
  outline: none;
  font-size: 14px;
}

.picker-list {
  overflow-y: auto;
  max-height: 350px;
  padding: 8px;
}

.picker-item {
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.picker-item:hover {
  background: #f3f4f6;
}

.picker-empty {
  padding: 32px;
  text-align: center;
  color: #9ca3af;
}
</style>
