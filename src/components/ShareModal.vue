<template>
  <div v-if="visible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Поделиться страницей</h3>
        <button @click="closeModal" class="close-button" aria-label="Закрыть">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="toggle-container">
          <div class="toggle-label">
            <span class="toggle-title">Публичный доступ</span>
            <span class="toggle-description">
              {{ isShared ? 'Страница доступна по ссылке' : 'Страница доступна только вам' }}
            </span>
          </div>
          <button
            @click="handleToggleShare"
            :disabled="isLoading"
            class="toggle-button"
            :class="{ active: isShared }"
            role="switch"
            :aria-checked="isShared"
          >
            <span class="toggle-slider" :class="{ active: isShared }"></span>
          </button>
        </div>

        <div v-if="isShared && shareUrl" class="share-link-container">
          <div class="share-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Любой с этой ссылкой может просматривать страницу</span>
          </div>

          <div class="link-input-container">
            <input
              ref="linkInput"
              :value="shareUrl"
              readonly
              class="link-input"
              @focus="$event.target.select()"
            />
            <button
              @click="handleCopyLink"
              class="copy-button"
              :class="{ copied: isCopied }"
            >
              <svg
                v-if="!isCopied"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{{ isCopied ? 'Скопировано' : 'Копировать' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Note } from '../types';
import { shareApi } from '../api/share';
import { useToast } from '../composables/useToast';

const props = defineProps<{
  visible: boolean;
  note: Note;
}>();

const emit = defineEmits<{
  close: [];
  updated: [note: Note];
}>();

const { showSuccess, showError } = useToast();
const isLoading = ref(false);
const isCopied = ref(false);
const linkInput = ref<HTMLInputElement | null>(null);

const isShared = computed(() => !!props.note.shareToken);

const shareUrl = computed(() => {
  if (!props.note.shareToken) return '';
  const baseUrl = window.location.origin;
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${baseUrl}${basePath}/share/${props.note.shareToken}`;
});

const handleToggleShare = async () => {
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    if (isShared.value) {
      await shareApi.disableShare(props.note.id);
      const updatedNote = { ...props.note, shareToken: null };
      emit('updated', updatedNote);
      showSuccess('Публичный доступ отключён');
    } else {
      const response = await shareApi.enableShare(props.note.id);
      const updatedNote = { ...props.note, shareToken: response.shareToken };
      emit('updated', updatedNote);
      showSuccess('Публичная ссылка создана');
    }
  } catch (error) {
    console.error('Ошибка при управлении шарингом:', error);
    showError('Не удалось изменить настройки доступа');
  } finally {
    isLoading.value = false;
  }
};

const handleCopyLink = async () => {
  if (!shareUrl.value) return;

  try {
    await navigator.clipboard.writeText(shareUrl.value);
    isCopied.value = true;
    showSuccess('Ссылка скопирована в буфер обмена');

    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Ошибка при копировании:', error);

    if (linkInput.value) {
      linkInput.value.select();
      try {
        document.execCommand('copy');
        isCopied.value = true;
        showSuccess('Ссылка скопирована в буфер обмена');

        setTimeout(() => {
          isCopied.value = false;
        }, 2000);
      } catch (fallbackError) {
        showError('Не удалось скопировать ссылку');
      }
    } else {
      showError('Не удалось скопировать ссылку');
    }
  }
};

const closeModal = () => {
  isCopied.value = false;
  emit('close');
};

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    isCopied.value = false;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.dark .modal-content {
  background: #1f2937;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .modal-header {
  border-bottom-color: #374151;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dark .modal-title {
  color: #f9fafb;
}

.close-button {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .close-button {
  color: #9ca3af;
}

.dark .close-button:hover {
  background: #374151;
  color: #e5e7eb;
}

.modal-body {
  padding: 24px;
}

.toggle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.dark .toggle-title {
  color: #f9fafb;
}

.toggle-description {
  font-size: 13px;
  color: #6b7280;
}

.dark .toggle-description {
  color: #9ca3af;
}

.toggle-button {
  position: relative;
  width: 48px;
  height: 28px;
  background: #d1d5db;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0;
}

.toggle-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-button.active {
  background: #3b82f6;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-slider.active {
  transform: translateX(20px);
}

.share-link-container {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
}

.dark .share-info {
  background: #1e3a5f;
  color: #93c5fd;
}

.share-info svg {
  flex-shrink: 0;
}

.link-input-container {
  display: flex;
  gap: 8px;
}

.link-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  color: #374151;
  background: #f9fafb;
  outline: none;
  transition: all 0.2s ease;
}

.link-input:focus {
  border-color: #3b82f6;
  background: white;
}

.dark .link-input {
  background: #111827;
  border-color: #374151;
  color: #e5e7eb;
}

.dark .link-input:focus {
  border-color: #60a5fa;
  background: #1f2937;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.copy-button:hover {
  background: #2563eb;
}

.copy-button.copied {
  background: #10b981;
}

.copy-button.copied:hover {
  background: #059669;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-content {
    max-width: 100%;
    border-radius: 0;
    max-height: 100vh;
  }

  .link-input-container {
    flex-direction: column;
  }

  .copy-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
