<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click.self="handleCancel"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          @click.stop
        >
          <!-- Заголовок -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Голосовая заметка
            </h3>
          </div>

          <!-- Содержимое -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Сообщение о неподдержке -->
            <div v-if="!isSupported" class="text-center py-8">
              <div class="text-red-600 dark:text-red-400 mb-2">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-700 dark:text-gray-300 mb-4">
                Распознавание речи не поддерживается в этом браузере
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Попробуйте использовать Chrome, Edge или Safari
              </p>
            </div>

            <!-- Интерфейс записи -->
            <div v-else>
              <!-- Индикатор записи -->
              <div class="flex flex-col items-center justify-center mb-6">
                <button
                  @click="toggleRecording"
                  :class="[
                    'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-blue-500 hover:bg-blue-600'
                  ]"
                  :disabled="isLoading"
                >
                  <svg v-if="!isListening" class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <svg v-else class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
                <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  {{ isListening ? 'Идет запись... Нажмите, чтобы остановить' : 'Нажмите, чтобы начать запись' }}
                </p>
              </div>

              <!-- Распознанный текст -->
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
                <p v-if="!fullTranscript && !interimTranscript" class="text-gray-400 dark:text-gray-500 text-center">
                  Распознанный текст появится здесь...
                </p>
                <p v-else class="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {{ fullTranscript }}
                  <span class="text-gray-400 dark:text-gray-500">{{ interimTranscript }}</span>
                </p>
              </div>

              <!-- Ошибка -->
              <p v-if="errorMessage" class="mt-4 text-sm text-red-600 dark:text-red-400">
                {{ errorMessage }}
              </p>
            </div>
          </div>

          <!-- Футер -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              :disabled="isLoading"
            >
              Отмена
            </button>
            <button
              v-if="isSupported"
              @click="handleSave"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoading || !fullTranscript.trim()"
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
import { useSpeechRecognition } from '../../composables/useSpeechRecognition';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [text: string];
}>();

const {
  isSupported,
  isListening,
  transcript,
  interimTranscript,
  error,
  start,
  stop,
  reset,
} = useSpeechRecognition();

const isLoading = ref(false);
const fullTranscript = ref('');
const errorMessage = ref('');

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    fullTranscript.value = '';
    errorMessage.value = '';
    reset();
  } else {
    if (isListening.value) {
      stop();
    }
  }
});

watch(transcript, (newValue) => {
  fullTranscript.value = newValue;
});

watch(error, (newValue) => {
  errorMessage.value = newValue || '';
});

function toggleRecording() {
  if (isListening.value) {
    stop();
  } else {
    errorMessage.value = '';
    if (!start()) {
      errorMessage.value = 'Не удалось начать запись. Проверьте доступ к микрофону.';
    }
  }
}

function handleCancel() {
  if (isListening.value) {
    stop();
  }
  emit('close');
}

function handleSave() {
  if (!fullTranscript.value || fullTranscript.value.trim().length === 0) {
    errorMessage.value = 'Текст не может быть пустым';
    return;
  }

  if (isListening.value) {
    stop();
  }

  emit('save', fullTranscript.value);
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
