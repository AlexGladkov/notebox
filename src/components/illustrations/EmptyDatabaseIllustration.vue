<template>
  <svg
    class="empty-database-illustration"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Таблица (контур) -->
    <rect x="30" y="40" width="100" height="80" rx="4" class="table-border" stroke-width="2" />

    <!-- Горизонтальные линии -->
    <line x1="30" y1="60" x2="130" y2="60" class="table-line" stroke-width="1.5" />
    <line x1="30" y1="80" x2="130" y2="80" class="table-line" stroke-width="1.5" />
    <line x1="30" y1="100" x2="130" y2="100" class="table-line" stroke-width="1.5" />

    <!-- Вертикальные линии -->
    <line x1="65" y1="40" x2="65" y2="120" class="table-line" stroke-width="1.5" />
    <line x1="95" y1="40" x2="95" y2="120" class="table-line" stroke-width="1.5" />

    <!-- Знак "+" в центре -->
    <circle cx="80" cy="80" r="18" class="plus-circle" stroke-width="2" />
    <line x1="80" y1="70" x2="80" y2="90" class="plus-line" stroke-width="2.5" stroke-linecap="round" />
    <line x1="70" y1="80" x2="90" y2="80" class="plus-line" stroke-width="2.5" stroke-linecap="round" />
  </svg>
</template>

<script setup lang="ts">
// Компонент иллюстрации пустой базы данных
</script>

<style scoped>
.empty-database-illustration {
  width: 140px;
  height: 140px;
}

.table-border {
  fill: none;
  stroke: #9ca3af;
}

.table-line {
  stroke: #d1d5db;
}

.plus-circle {
  fill: #eff6ff;
  stroke: #3b82f6;
}

.plus-line {
  stroke: #3b82f6;
}

/* Тёмная тема */
.dark .table-border {
  stroke: #6b7280;
}

.dark .table-line {
  stroke: #4b5563;
}

.dark .plus-circle {
  fill: #1e3a8a;
  stroke: #60a5fa;
}

.dark .plus-line {
  stroke: #60a5fa;
}
</style>
