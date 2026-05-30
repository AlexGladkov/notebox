<template>
  <div class="share-button-wrapper">
    <button
      @click="openShareModal"
      class="share-button"
      :class="{ 'is-shared': isShared }"
      title="Поделиться"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
      <span v-if="isShared" class="share-indicator"></span>
    </button>

    <ShareModal
      :visible="modalVisible"
      :note="note"
      @close="closeModal"
      @updated="handleUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Note } from '../types';
import ShareModal from './ShareModal.vue';

const props = defineProps<{
  note: Note;
}>();

const emit = defineEmits<{
  updated: [note: Note];
}>();

const modalVisible = ref(false);

const isShared = computed(() => !!props.note.shareToken);

const openShareModal = () => {
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
};

const handleUpdated = (updatedNote: Note) => {
  emit('updated', updatedNote);
};
</script>

<style scoped>
.share-button-wrapper {
  position: relative;
  display: inline-flex;
}

.share-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.share-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .share-button {
  color: #9ca3af;
}

.dark .share-button:hover {
  background: #374151;
  color: #e5e7eb;
}

.share-button.is-shared {
  color: #3b82f6;
}

.dark .share-button.is-shared {
  color: #60a5fa;
}

.share-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 0 2px white;
}

.dark .share-indicator {
  background: #60a5fa;
  box-shadow: 0 0 0 2px #1f2937;
}

.touch-target {
  min-width: 44px;
  min-height: 44px;
}
</style>
