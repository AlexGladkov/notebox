<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click.self="handleCancel"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          @click.stop
        >
          <!-- Заголовок -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              OCR - Распознавание текста с фото
            </h3>
          </div>

          <!-- Содержимое -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Загрузка изображения -->
            <div v-if="!imagePreview" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div class="mt-4 flex flex-col items-center gap-2">
                  <label
                    for="file-upload"
                    class="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Выбрать файл
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    class="hidden"
                    @change="handleFileSelect"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF до 10MB
                  </p>
                </div>
              </div>
            </div>

            <!-- Предпросмотр и распознанный текст -->
            <div v-else class="space-y-4">
              <!-- Предпросмотр изображения -->
              <div class="relative">
                <img
                  :src="imagePreview"
                  alt="Preview"
                  class="w-full h-64 object-contain bg-gray-100 dark:bg-gray-700 rounded-lg"
                />
                <button
                  @click="clearImage"
                  class="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  :disabled="isRecognizing"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Кнопка распознавания -->
              <button
                v-if="!recognizedText && !isRecognizing"
                @click="recognizeText"
                class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Распознать текст
              </button>

              <!-- Процесс распознавания -->
              <div v-if="isRecognizing" class="text-center py-4">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Распознавание текста...</p>
              </div>

              <!-- Распознанный текст (редактируемый) -->
              <div v-if="recognizedText">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Распознанный текст (можно редактировать):
                </label>
                <textarea
                  v-model="recognizedText"
                  class="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <!-- Ошибка -->
            <p v-if="errorMessage" class="mt-4 text-sm text-red-600 dark:text-red-400">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Футер -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              :disabled="isLoading || isRecognizing"
            >
              Отмена
            </button>
            <button
              @click="handleSave"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoading || isRecognizing || !recognizedText?.trim()"
            >
              {{ isLoading ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { aiApi } from '../../api/ai';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [text: string, imageBase64: string];
}>();

const imagePreview = ref('');
const imageBase64 = ref('');
const recognizedText = ref('');
const isRecognizing = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    clearImage();
    errorMessage.value = '';
  }
});

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  errorMessage.value = '';

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = 'Файл слишком большой. Максимальный размер: 10MB';
    return;
  }

  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Выбранный файл не является изображением';
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const result = e.target?.result as string;
    imagePreview.value = result;
    imageBase64.value = result.split(',')[1]; // Убираем data:image/...;base64,
  };

  reader.onerror = () => {
    errorMessage.value = 'Не удалось прочитать файл';
  };

  reader.readAsDataURL(file);
}

function clearImage() {
  imagePreview.value = '';
  imageBase64.value = '';
  recognizedText.value = '';
  errorMessage.value = '';

  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
}

async function recognizeText() {
  if (!imageBase64.value) return;

  isRecognizing.value = true;
  errorMessage.value = '';

  try {
    const text = await aiApi.ocr(imageBase64.value);
    recognizedText.value = text;
  } catch (error) {
    console.error('OCR error:', error);
    errorMessage.value = 'Не удалось распознать текст. Попробуйте другое изображение.';
  } finally {
    isRecognizing.value = false;
  }
}

function handleCancel() {
  emit('close');
}

function handleSave() {
  if (!recognizedText.value || recognizedText.value.trim().length === 0) {
    errorMessage.value = 'Текст не может быть пустым';
    return;
  }

  emit('save', recognizedText.value, imageBase64.value);
}

defineExpose({
  setLoading: (loading: boolean) => {
    isLoading.value = loading;
  },
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white,
.modal-enter-active .dark\:bg-gray-800,
.modal-leave-active .dark\:bg-gray-800 {
  transition: transform 0.2s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white,
.modal-enter-from .dark\:bg-gray-800,
.modal-leave-to .dark\:bg-gray-800 {
  transform: scale(0.95);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
