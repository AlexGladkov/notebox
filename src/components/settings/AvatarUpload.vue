<template>
  <div class="avatar-upload">
    <div class="avatar-container">
      <img
        v-if="previewUrl || currentAvatar"
        :src="previewUrl || currentAvatar"
        alt="Avatar"
        class="avatar-preview"
      />
      <div v-else class="avatar-placeholder">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <div v-if="isUploading" class="upload-overlay">
        <div class="spinner"></div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="button-group">
      <button
        type="button"
        @click="selectFile"
        :disabled="isUploading"
        class="btn-primary"
      >
        {{ currentAvatar ? 'Изменить' : 'Загрузить' }}
      </button>

      <button
        v-if="currentAvatar"
        type="button"
        @click="removeAvatar"
        :disabled="isUploading"
        class="btn-secondary"
      >
        Удалить
      </button>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>
    <p class="help-text">Максимальный размер: 5 МБ. Форматы: JPG, PNG, GIF</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { filesApi } from '../../api/files';

const props = defineProps<{
  currentAvatar?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update', avatarUrl: string): void;
  (e: 'remove'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);
const isUploading = ref(false);
const error = ref<string | null>(null);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const selectFile = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  error.value = null;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Пожалуйста, выберите изображение';
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    error.value = 'Файл слишком большой. Максимальный размер: 5 МБ';
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // Upload file
  isUploading.value = true;
  try {
    const uploadResult = await filesApi.upload(file);
    const avatarUrl = await filesApi.getUrl(uploadResult.key);
    emit('update', avatarUrl);
  } catch (err: any) {
    error.value = err.message || 'Ошибка при загрузке файла';
    previewUrl.value = null;
  } finally {
    isUploading.value = false;
    // Reset input
    if (target) target.value = '';
  }
};

const removeAvatar = () => {
  previewUrl.value = null;
  emit('remove');
};
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: #f3f4f6;
  border: 3px solid #e5e7eb;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hidden {
  display: none;
}

.button-group {
  display: flex;
  gap: 8px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.btn-secondary:hover:not(:disabled) {
  background: #fee;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin: 0;
}

.help-text {
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  margin: 0;
}

:global(.dark) .avatar-container {
  background: #374151;
  border-color: #4b5563;
}

:global(.dark) .avatar-placeholder {
  color: #9ca3af;
}

:global(.dark) .btn-secondary {
  background: #1f2937;
  border-color: #7f1d1d;
}

:global(.dark) .btn-secondary:hover:not(:disabled) {
  background: #374151;
}

:global(.dark) .help-text {
  color: #9ca3af;
}
</style>
