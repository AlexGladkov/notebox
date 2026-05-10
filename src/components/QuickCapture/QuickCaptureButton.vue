<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end">
    <!-- Меню опций -->
    <QuickCaptureMenu
      :is-open="isMenuOpen"
      @select="handleCaptureTypeSelect"
    />

    <!-- Главная FAB кнопка -->
    <button
      @click="toggleMenu"
      :class="[
        'fab-main group',
        { 'rotate-45': isMenuOpen }
      ]"
      :aria-label="'Быстрый захват'"
      :aria-expanded="isMenuOpen"
    >
      <svg class="w-7 h-7 text-white transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Модалы -->
    <TextCaptureModal
      ref="textModalRef"
      :is-open="activeModal === 'text'"
      @close="closeModal"
      @save="handleTextSave"
    />

    <VoiceCaptureModal
      ref="voiceModalRef"
      :is-open="activeModal === 'voice'"
      @close="closeModal"
      @save="handleVoiceSave"
    />

    <PhotoCaptureModal
      ref="photoModalRef"
      :is-open="activeModal === 'photo'"
      @close="closeModal"
      @save="handlePhotoSave"
    />

    <NoteSuggestionModal
      ref="suggestionModalRef"
      :is-open="activeModal === 'suggestions'"
      :captured-text="capturedText"
      :suggestions="suggestions"
      @close="closeModal"
      @select-note="handleMoveToNote"
      @stay-in-inbox="handleStayInInbox"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import QuickCaptureMenu from './QuickCaptureMenu.vue';
import TextCaptureModal from './TextCaptureModal.vue';
import VoiceCaptureModal from './VoiceCaptureModal.vue';
import PhotoCaptureModal from './PhotoCaptureModal.vue';
import NoteSuggestionModal from './NoteSuggestionModal.vue';
import { useQuickCapture } from '../../composables/useQuickCapture';
import type { CaptureType, RelatedNote } from '../../types';

const isMenuOpen = ref(false);
const activeModal = ref<CaptureType | 'suggestions' | null>(null);
const capturedText = ref('');
const suggestions = ref<RelatedNote[]>([]);

const textModalRef = ref<InstanceType<typeof TextCaptureModal> | null>(null);
const voiceModalRef = ref<InstanceType<typeof VoiceCaptureModal> | null>(null);
const photoModalRef = ref<InstanceType<typeof PhotoCaptureModal> | null>(null);
const suggestionModalRef = ref<InstanceType<typeof NoteSuggestionModal> | null>(null);

const {
  captureText,
  captureVoice,
  capturePhoto,
  findRelatedNotes,
  moveToNote,
  addTextToNote,
} = useQuickCapture();

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function handleCaptureTypeSelect(type: CaptureType) {
  closeMenu();
  activeModal.value = type;
}

function closeModal() {
  activeModal.value = null;
  capturedText.value = '';
  suggestions.value = [];
}

async function handleTextSave(text: string) {
  try {
    textModalRef.value?.setLoading(true);
    capturedText.value = text;

    // Ищем похожие заметки для AI организации
    const relatedNotes = await findRelatedNotes(text);

    if (relatedNotes.length > 0) {
      // Показываем модал с предложениями
      suggestions.value = relatedNotes;
      activeModal.value = 'suggestions';
    } else {
      // Если похожих заметок нет, сохраняем в Inbox
      await captureText(text);
      closeModal();
      showSuccessNotification('Заметка сохранена в Inbox');
    }
  } catch (error) {
    console.error('Failed to capture text:', error);
    showErrorNotification('Не удалось сохранить заметку');
  } finally {
    textModalRef.value?.setLoading(false);
  }
}

async function handleVoiceSave(text: string) {
  try {
    voiceModalRef.value?.setLoading(true);
    capturedText.value = text;

    const relatedNotes = await findRelatedNotes(text);

    if (relatedNotes.length > 0) {
      suggestions.value = relatedNotes;
      activeModal.value = 'suggestions';
    } else {
      await captureVoice(text);
      closeModal();
      showSuccessNotification('Голосовая заметка сохранена в Inbox');
    }
  } catch (error) {
    console.error('Failed to capture voice:', error);
    showErrorNotification('Не удалось сохранить голосовую заметку');
  } finally {
    voiceModalRef.value?.setLoading(false);
  }
}

async function handlePhotoSave(text: string, imageBase64: string) {
  try {
    photoModalRef.value?.setLoading(true);
    capturedText.value = text;

    const relatedNotes = await findRelatedNotes(text);

    if (relatedNotes.length > 0) {
      suggestions.value = relatedNotes;
      activeModal.value = 'suggestions';
    } else {
      await capturePhoto(imageBase64, text);
      closeModal();
      showSuccessNotification('Текст с фото сохранен в Inbox');
    }
  } catch (error) {
    console.error('Failed to capture photo:', error);
    showErrorNotification('Не удалось сохранить текст с фото');
  } finally {
    photoModalRef.value?.setLoading(false);
  }
}

async function handleMoveToNote(noteId: string) {
  try {
    suggestionModalRef.value?.setLoading(true);
    await moveToNote(capturedText.value, noteId);
    closeModal();
    showSuccessNotification('Заметка перемещена');
  } catch (error) {
    console.error('Failed to move to note:', error);
    showErrorNotification('Не удалось переместить заметку');
  } finally {
    suggestionModalRef.value?.setLoading(false);
  }
}

async function handleStayInInbox() {
  try {
    suggestionModalRef.value?.setLoading(true);
    await captureText(capturedText.value);
    closeModal();
    showSuccessNotification('Заметка сохранена в Inbox');
  } catch (error) {
    console.error('Failed to save to inbox:', error);
    showErrorNotification('Не удалось сохранить в Inbox');
  } finally {
    suggestionModalRef.value?.setLoading(false);
  }
}

function showSuccessNotification(message: string) {
  // TODO: Заменить на полноценную систему уведомлений
  alert(message);
}

function showErrorNotification(message: string) {
  // TODO: Заменить на полноценную систему уведомлений
  alert(message);
}
</script>

<style scoped>
.fab-main {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 9999px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: none;
  outline: none;
}

.fab-main:hover {
  transform: scale(1.1);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
}

.fab-main:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.fab-main:active {
  transform: scale(0.95);
}

.fab-main.rotate-45 {
  transform: rotate(45deg);
}

.fab-main.rotate-45:hover {
  transform: rotate(45deg) scale(1.1);
}

.dark .fab-main {
  background: linear-gradient(135deg, #4c51bf 0%, #5a4bb8 100%);
}

.dark .fab-main:focus {
  outline-color: #4c51bf;
}

@media (max-width: 640px) {
  .fab-main {
    width: 3.5rem;
    height: 3.5rem;
  }
}
</style>
