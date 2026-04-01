<template>
  <div class="file-cell">
    <!-- Миниатюры загруженных файлов -->
    <div v-if="files.length > 0" class="file-thumbnails" @click="openFileDialog">
      <!-- Отображаем до 3 миниатюр -->
      <div
        v-for="(file, index) in visibleFiles"
        :key="file.id"
        class="file-thumbnail"
        :title="file.filename"
      >
        <img
          v-if="isImage(file.contentType)"
          :src="file.url"
          :alt="file.filename"
          class="thumbnail-image"
        />
        <div v-else class="thumbnail-icon">
          {{ getFileIcon(file.contentType) }}
        </div>
        <button
          class="delete-file-btn"
          @click.stop="deleteFile(file.id)"
          title="Удалить файл"
        >
          ×
        </button>
      </div>

      <!-- Счётчик дополнительных файлов -->
      <div v-if="remainingCount > 0" class="remaining-badge">
        +{{ remainingCount }}
      </div>
    </div>

    <!-- Пустое состояние -->
    <div v-else class="empty-state" @click="openFileDialog">
      <span class="cell-value empty">Добавить файлы</span>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="uploading" class="upload-indicator">
      <div class="spinner"></div>
      <span>Загрузка...</span>
    </div>

    <!-- Скрытый input для выбора файлов -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,application/pdf,video/*"
      class="hidden-input"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { filesApi } from '../../../api/files';
import type { FileCellValue, FileValue } from '../../../types';

const props = defineProps<{
  value: FileValue | null;
}>();

const emit = defineEmits<{
  update: [value: FileValue];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

const MAX_VISIBLE_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Извлечение списка файлов из value
const files = computed(() => {
  return props.value?.files || [];
});

// Файлы для отображения (максимум 3)
const visibleFiles = computed(() => {
  return files.value.slice(0, MAX_VISIBLE_FILES);
});

// Количество скрытых файлов
const remainingCount = computed(() => {
  return Math.max(0, files.value.length - MAX_VISIBLE_FILES);
});

// Проверка, является ли файл изображением
const isImage = (contentType: string): boolean => {
  return contentType.startsWith('image/');
};

// Получение иконки для типа файла
const getFileIcon = (contentType: string): string => {
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('video')) return '🎥';
  if (contentType.includes('audio')) return '🎵';
  if (contentType.includes('zip') || contentType.includes('archive')) return '📦';
  if (contentType.includes('text')) return '📝';
  return '📎';
};

// Открытие диалога выбора файлов
const openFileDialog = () => {
  if (uploading.value) return;
  fileInput.value?.click();
};

// Обработка выбора файлов
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const selectedFiles = target.files;

  if (!selectedFiles || selectedFiles.length === 0) return;

  // Проверка размера файлов
  const invalidFiles = Array.from(selectedFiles).filter(
    file => file.size > MAX_FILE_SIZE
  );

  if (invalidFiles.length > 0) {
    alert(`Некоторые файлы превышают максимальный размер 10MB и будут пропущены:\n${invalidFiles.map(f => f.name).join('\n')}`);
  }

  const validFiles = Array.from(selectedFiles).filter(
    file => file.size <= MAX_FILE_SIZE
  );

  if (validFiles.length === 0) return;

  uploading.value = true;

  try {
    // Загружаем все файлы параллельно
    const uploadPromises = validFiles.map(async (file) => {
      try {
        const response = await filesApi.upload(file);

        // Получаем URL для файла
        const url = await filesApi.getUrl(response.key);

        const fileValue: FileCellValue = {
          id: uuidv4(),
          fileId: response.fileId,
          filename: response.filename,
          url: url,
          contentType: response.contentType || 'application/octet-stream',
          size: response.size,
          key: response.key,
        };

        return { status: 'fulfilled' as const, value: fileValue, filename: file.name };
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        return { status: 'rejected' as const, reason: error, filename: file.name };
      }
    });

    const results = await Promise.all(uploadPromises);

    // Разделяем успешные и неудачные загрузки
    const successfulUploads = results
      .filter((result): result is { status: 'fulfilled'; value: FileCellValue; filename: string } => result.status === 'fulfilled')
      .map(result => result.value);

    const failedUploads = results
      .filter((result): result is { status: 'rejected'; reason: unknown; filename: string } => result.status === 'rejected')
      .map(result => result.filename);

    // Если есть успешные загрузки, обновляем значение ячейки
    if (successfulUploads.length > 0) {
      const newValue: FileValue = {
        files: [...files.value, ...successfulUploads],
      };

      emit('update', newValue);
    }

    // Если были ошибки, уведомляем пользователя
    if (failedUploads.length > 0) {
      const message = successfulUploads.length > 0
        ? `Не удалось загрузить ${failedUploads.length} из ${results.length} файлов:\n${failedUploads.join('\n')}`
        : `Ошибка при загрузке файлов:\n${failedUploads.join('\n')}`;
      alert(message);
    }
  } catch (error) {
    console.error('Unexpected error during file upload:', error);
    alert('Неожиданная ошибка при загрузке файлов. Попробуйте снова.');
  } finally {
    uploading.value = false;
    // Очищаем input для возможности повторной загрузки тех же файлов
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

// Удаление файла
const deleteFile = async (fileId: string) => {
  const fileToDelete = files.value.find(f => f.id === fileId);
  if (!fileToDelete) return;

  try {
    // Удаляем файл на сервере
    await filesApi.delete(fileToDelete.key);

    // Обновляем значение ячейки
    const newValue: FileValue = {
      files: files.value.filter(f => f.id !== fileId),
    };

    emit('update', newValue);
  } catch (error) {
    console.error('Failed to delete file:', error);
    alert('Ошибка при удалении файла.');
  }
};
</script>

<style scoped>
.file-cell {
  width: 100%;
  min-height: 20px;
  position: relative;
}

.file-thumbnails {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-wrap: wrap;
}

.file-thumbnail {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.dark .file-thumbnail {
  border-color: #374151;
  background: #1f2937;
}

.file-thumbnail:hover {
  transform: scale(1.05);
  border-color: #3b82f6;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-icon {
  font-size: 18px;
}

.delete-file-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.15s ease;
}

.file-thumbnail:hover .delete-file-btn {
  display: flex;
}

.delete-file-btn:hover {
  background: #dc2626;
}

.remaining-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.empty-state {
  width: 100%;
  cursor: pointer;
  padding: 2px 0;
}

.cell-value.empty {
  color: #d1d5db;
  font-size: 14px;
}

.dark .cell-value.empty {
  color: #6b7280;
}

.upload-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 13px;
  color: #374151;
  z-index: 10;
}

.dark .upload-indicator {
  background: rgba(31, 41, 55, 0.95);
  border-color: #374151;
  color: #e5e7eb;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hidden-input {
  display: none;
}
</style>
