<template>
  <header class="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
    <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">NoteBox</h1>

    <button
      @click="cycleTheme"
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      :title="themeTooltip"
      aria-label="Переключить тему"
    >
      <!-- Иконка солнца (светлая тема) -->
      <svg
        v-if="themeMode === 'light'"
        class="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      <!-- Иконка луны (тёмная тема) -->
      <svg
        v-else-if="themeMode === 'dark'"
        class="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      <!-- Иконка монитора (системная тема) -->
      <svg
        v-else
        class="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </button>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';

const { themeMode, cycleTheme } = useTheme();

const themeTooltip = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return 'Светлая тема';
    case 'dark':
      return 'Тёмная тема';
    case 'system':
      return 'Системная тема';
    default:
      return 'Переключить тему';
  }
});
</script>
