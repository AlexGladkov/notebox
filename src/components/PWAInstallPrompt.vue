<template>
  <Transition name="slide-up">
    <div
      v-if="show"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              Установить NoteBox
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Добавьте приложение на домашний экран для быстрого доступа
            </p>
            <div class="flex gap-2 mt-3">
              <button
                @click="handleInstall"
                class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
              >
                Установить
              </button>
              <button
                @click="handleDismiss"
                class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
          <button
            @click="handleDismiss"
            class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps<{
  canInstall: boolean;
  isInstalled: boolean;
}>();

const emit = defineEmits<{
  install: [];
}>();

const dismissed = ref(false);
const dismissedKey = 'notebox-pwa-install-dismissed';

const show = computed(() => {
  return props.canInstall && !props.isInstalled && !dismissed.value;
});

onMounted(() => {
  // Проверяем, был ли промпт закрыт ранее
  const wasDismissed = localStorage.getItem(dismissedKey);
  if (wasDismissed === 'true') {
    dismissed.value = true;
  }
});

// Сбрасываем dismissed при повторном появлении возможности установки
watch(() => props.canInstall, (canInstall) => {
  if (canInstall) {
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed !== 'true') {
      dismissed.value = false;
    }
  }
});

const handleInstall = () => {
  emit('install');
  dismissed.value = true;
  localStorage.removeItem(dismissedKey);
};

const handleDismiss = () => {
  dismissed.value = true;
  localStorage.setItem(dismissedKey, 'true');
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
