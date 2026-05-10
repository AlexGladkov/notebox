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
              Куда сохранить заметку?
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              AI нашёл похожие заметки. Выберите, куда добавить захваченный текст.
            </p>
          </div>

          <!-- Содержимое -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Предпросмотр захваченного текста -->
            <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Захваченный текст:
              </p>
              <p class="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
                {{ capturedText }}
              </p>
            </div>

            <!-- Список предложенных заметок -->
            <div v-if="suggestions.length > 0" class="space-y-3 mb-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Похожие заметки:
              </p>
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.note.id"
                @click="handleSelectNote(suggestion.note.id)"
                :class="[
                  'w-full text-left p-4 border-2 rounded-lg transition-all',
                  selectedNoteId === suggestion.note.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                ]"
              >
                <div class="flex items-start gap-3">
                  <div v-if="suggestion.note.icon" class="text-2xl flex-shrink-0">
                    {{ suggestion.note.icon }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ suggestion.note.title || 'Без названия' }}
                    </p>
                    <p v-if="suggestion.reason" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {{ suggestion.reason }}
                    </p>
                    <div class="mt-2 flex items-center gap-2">
                      <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div
                          class="bg-blue-600 h-1.5 rounded-full"
                          :style="{ width: `${Math.round(suggestion.similarity * 100)}%` }"
                        ></div>
                      </div>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {{ Math.round(suggestion.similarity * 100) }}%
                      </span>
                    </div>
                  </div>
                  <svg
                    v-if="selectedNoteId === suggestion.note.id"
                    class="w-5 h-5 text-blue-600 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            </div>

            <!-- Альтернативные опции -->
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Другие варианты:
              </p>
              <button
                @click="handleSelectInbox"
                :class="[
                  'w-full text-left p-4 border-2 rounded-lg transition-all',
                  selectedNoteId === 'inbox'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                ]"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">📥</span>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100">
                        Оставить в Inbox
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        Разобрать позже
                      </p>
                    </div>
                  </div>
                  <svg
                    v-if="selectedNoteId === 'inbox'"
                    class="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
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
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoading || !selectedNoteId"
            >
              {{ isLoading ? 'Перемещение...' : 'Переместить' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RelatedNote } from '../../types';

const props = defineProps<{
  isOpen: boolean;
  capturedText: string;
  suggestions: RelatedNote[];
}>();

const emit = defineEmits<{
  close: [];
  selectNote: [noteId: string];
  stayInInbox: [];
}>();

const selectedNoteId = ref<string | null>(null);
const isLoading = ref(false);

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    selectedNoteId.value = 'inbox'; // По умолчанию выбран Inbox
  }
});

function handleSelectNote(noteId: string) {
  selectedNoteId.value = noteId;
}

function handleSelectInbox() {
  selectedNoteId.value = 'inbox';
}

function handleCancel() {
  emit('close');
}

function handleConfirm() {
  if (!selectedNoteId.value) return;

  if (selectedNoteId.value === 'inbox') {
    emit('stayInInbox');
  } else {
    emit('selectNote', selectedNoteId.value);
  }
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

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
