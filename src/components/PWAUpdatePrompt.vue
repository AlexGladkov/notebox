<template>
  <Transition name="slide-down">
    <div
      v-if="needRefresh"
      class="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50"
    >
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Доступно обновление
            </h3>
            <p class="text-xs text-blue-700 dark:text-blue-200 mt-1">
              Новая версия NoteBox готова к установке
            </p>
            <div class="flex gap-2 mt-3">
              <button
                @click="handleUpdate"
                :disabled="updating"
                class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white text-xs font-medium rounded transition-colors disabled:cursor-not-allowed"
              >
                {{ updating ? 'Обновление...' : 'Обновить сейчас' }}
              </button>
              <button
                @click="handleDismiss"
                :disabled="updating"
                class="px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-200 text-xs font-medium rounded border border-blue-200 dark:border-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  needRefresh: boolean;
}>();

const emit = defineEmits<{
  update: [];
  dismiss: [];
}>();

const updating = ref(false);

const handleUpdate = async () => {
  updating.value = true;
  emit('update');
  // Страница перезагрузится после обновления Service Worker
};

const handleDismiss = () => {
  emit('dismiss');
};
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
