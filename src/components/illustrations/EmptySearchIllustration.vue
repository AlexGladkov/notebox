<template>
  <svg
    class="empty-search-illustration"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Пунктирный круг (пустой результат) -->
    <circle
      cx="70"
      cy="70"
      r="30"
      class="search-circle"
      stroke-width="2"
      stroke-dasharray="5,5"
    />

    <!-- Лупа -->
    <circle
      cx="70"
      cy="70"
      r="25"
      class="magnifier-glass"
      stroke-width="3"
    />

    <!-- Ручка лупы -->
    <line
      x1="88"
      y1="88"
      x2="105"
      y2="105"
      class="magnifier-handle"
      stroke-width="5"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
// Компонент иллюстрации пустого поиска
</script>

<style scoped>
.empty-search-illustration {
  width: 140px;
  height: 140px;
}

.search-circle {
  fill: none;
  stroke: #d1d5db;
}

.magnifier-glass {
  fill: none;
  stroke: #9ca3af;
}

.magnifier-handle {
  stroke: #9ca3af;
}

/* Тёмная тема */
.dark .search-circle {
  stroke: #4b5563;
}

.dark .magnifier-glass {
  stroke: #6b7280;
}

.dark .magnifier-handle {
  stroke: #6b7280;
}
</style>
