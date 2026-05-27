<template>
  <svg
    class="empty-graph-illustration"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Связи между узлами -->
    <line x1="50" y1="50" x2="80" y2="80" class="graph-edge" stroke-width="2" />
    <line x1="110" y1="50" x2="80" y2="80" class="graph-edge" stroke-width="2" />
    <line x1="80" y1="80" x2="80" y2="120" class="graph-edge" stroke-width="2" />

    <!-- Узел 1 (верхний левый) -->
    <circle cx="50" cy="50" r="12" class="graph-node" stroke-width="2" />
    <circle cx="50" cy="50" r="5" class="graph-node-inner" />

    <!-- Узел 2 (верхний правый) -->
    <circle cx="110" cy="50" r="12" class="graph-node" stroke-width="2" />
    <circle cx="110" cy="50" r="5" class="graph-node-inner" />

    <!-- Узел 3 (центральный) -->
    <circle cx="80" cy="80" r="14" class="graph-node-primary" stroke-width="2.5" />
    <circle cx="80" cy="80" r="6" class="graph-node-inner-primary" />

    <!-- Узел 4 (нижний) -->
    <circle cx="80" cy="120" r="12" class="graph-node" stroke-width="2" />
    <circle cx="80" cy="120" r="5" class="graph-node-inner" />
  </svg>
</template>

<script setup lang="ts">
// Компонент иллюстрации графа связей
</script>

<style scoped>
.empty-graph-illustration {
  width: 140px;
  height: 140px;
}

.graph-edge {
  stroke: #d1d5db;
  stroke-linecap: round;
}

.graph-node {
  fill: #ffffff;
  stroke: #9ca3af;
}

.graph-node-inner {
  fill: #d1d5db;
}

.graph-node-primary {
  fill: #ffffff;
  stroke: #3b82f6;
}

.graph-node-inner-primary {
  fill: #3b82f6;
}

/* Тёмная тема */
.dark .graph-edge {
  stroke: #4b5563;
}

.dark .graph-node {
  fill: #1f2937;
  stroke: #6b7280;
}

.dark .graph-node-inner {
  fill: #4b5563;
}

.dark .graph-node-primary {
  fill: #1f2937;
  stroke: #60a5fa;
}

.dark .graph-node-inner-primary {
  fill: #60a5fa;
}
</style>
