<template>
  <svg
    class="empty-notes-illustration"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Блокнот -->
    <rect
      x="40"
      y="30"
      width="80"
      height="100"
      rx="4"
      class="notebook-bg"
      stroke-width="2"
    />

    <!-- Линии на странице -->
    <line x1="55" y1="55" x2="105" y2="55" class="notebook-line" stroke-width="1.5" />
    <line x1="55" y1="70" x2="105" y2="70" class="notebook-line" stroke-width="1.5" />
    <line x1="55" y1="85" x2="90" y2="85" class="notebook-line" stroke-width="1.5" />

    <!-- Карандаш -->
    <g transform="translate(95, 95) rotate(-45)">
      <rect x="0" y="0" width="30" height="8" rx="1" class="pencil-body" stroke-width="1.5" />
      <polygon points="30,0 35,4 30,8" class="pencil-tip" stroke-width="1.5" />
      <rect x="0" y="2" width="4" height="4" class="pencil-eraser" stroke-width="1" />
    </g>
  </svg>
</template>

<script setup lang="ts">
// Компонент иллюстрации пустого списка заметок
</script>

<style scoped>
.empty-notes-illustration {
  width: 140px;
  height: 140px;
}

.notebook-bg {
  fill: none;
  stroke: #9ca3af;
}

.notebook-line {
  stroke: #d1d5db;
  stroke-linecap: round;
}

.pencil-body {
  fill: #3b82f6;
  stroke: #2563eb;
}

.pencil-tip {
  fill: #1e40af;
  stroke: #1e3a8a;
}

.pencil-eraser {
  fill: #ef4444;
  stroke: #dc2626;
}

/* Тёмная тема */
.dark .notebook-bg {
  stroke: #6b7280;
}

.dark .notebook-line {
  stroke: #4b5563;
}

.dark .pencil-body {
  fill: #60a5fa;
  stroke: #3b82f6;
}

.dark .pencil-tip {
  fill: #3b82f6;
  stroke: #2563eb;
}

.dark .pencil-eraser {
  fill: #f87171;
  stroke: #ef4444;
}
</style>
