<template>
  <div class="mobile-header bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 md:hidden">
    <div class="flex items-center h-14 px-4">
      <button
        class="touch-target p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="$emit('toggle-drawer')"
        aria-label="Открыть меню"
      >
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="flex-1 flex justify-center">
        <span class="text-lg font-semibold text-gray-900 dark:text-white truncate px-4">
          {{ title }}
        </span>
      </div>

      <!-- Пустой элемент для баланса layout -->
      <div class="w-10"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();

defineEmits<{
  (e: 'toggle-drawer'): void;
}>();
</script>

<style scoped>
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-header {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>
