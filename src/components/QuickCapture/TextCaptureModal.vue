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
              Быстрая заметка
            </h3>
          </div>

          <!-- Содержимое -->
          <div class="flex-1 overflow-y-auto p-6">
            <textarea
              ref="textareaRef"
              v-model="text"
              placeholder="Быстрая заметка..."
              class="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              @keydown.meta.enter="handleSave"
              @keydown.ctrl.enter="handleSave"
            />
            <p v-if="validationError" class="mt-2 text-sm text-red-600 dark:text-red-400">
              {{ validationError }}
            </p>
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
              @click="handleSave"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoading || !text.trim()"
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
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [text: string];
}>();

const text = ref('');
const validationError = ref('');
const isLoading = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    text.value = '';
    validationError.value = '';
    await nextTick();
    textareaRef.value?.focus();
  }
});

function handleCancel() {
  emit('close');
}

function handleSave() {
  validationError.value = '';

  if (!text.value || text.value.trim().length === 0) {
    validationError.value = 'Текст не может быть пустым';
    return;
  }

  emit('save', text.value);
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
</style>
