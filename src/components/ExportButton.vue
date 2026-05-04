<template>
  <button
    @click="handleExport"
    :disabled="isExporting"
    :aria-label="isExporting ? 'Экспорт в PDF...' : 'Экспортировать заметку в PDF'"
    class="export-button"
    :class="{ 'exporting': isExporting }"
    title="Экспортировать в PDF"
  >
    <svg
      v-if="!isExporting"
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="12" y1="18" x2="12" y2="12"></line>
      <polyline points="9 15 12 18 15 15"></polyline>
    </svg>
    <svg
      v-else
      class="spinner"
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Note } from '../types';
import { exportNoteToPdf } from '../utils/pdfExport';

const props = defineProps<{
  note: Note;
}>();

const isExporting = ref(false);

const handleExport = async () => {
  if (isExporting.value) return;

  isExporting.value = true;

  try {
    await exportNoteToPdf({
      title: props.note.title || 'Без названия',
      content: props.note.content,
      tags: props.note.tags,
      updatedAt: props.note.updatedAt,
    });

    // Показываем уведомление об успехе
    showNotification('PDF успешно экспортирован');
  } catch (error) {
    console.error('Ошибка при экспорте PDF:', error);
    showNotification('Ошибка при экспорте PDF', true);
  } finally {
    isExporting.value = false;
  }
};

// Простое уведомление (можно заменить на более продвинутую систему уведомлений)
const showNotification = (message: string, isError = false) => {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background: ${isError ? '#f44336' : '#4caf50'};
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  // Добавляем стили анимации если их ещё нет
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
};
</script>

<style scoped>
.export-button {
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

.export-button:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.dark .export-button {
  color: #9ca3af;
}

.dark .export-button:hover:not(:disabled) {
  background: #374151;
  color: #e5e7eb;
}

.export-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-button.exporting {
  color: #2196f3;
}

.dark .export-button.exporting {
  color: #60a5fa;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
