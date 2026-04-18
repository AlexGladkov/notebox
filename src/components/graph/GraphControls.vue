<template>
  <div class="absolute top-4 right-4 flex flex-col gap-2 z-10">
    <button
      @click="$emit('zoom-in')"
      class="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="Увеличить"
      aria-label="Увеличить"
    >
      <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <button
      @click="$emit('zoom-out')"
      class="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="Уменьшить"
      aria-label="Уменьшить"
    >
      <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
      </svg>
    </button>

    <button
      @click="$emit('reset-view')"
      class="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="Сбросить вид"
      aria-label="Сбросить вид"
    >
      <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'zoom-in': [];
  'zoom-out': [];
  'reset-view': [];
}>();
</script>
