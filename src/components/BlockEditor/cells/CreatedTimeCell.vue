<template>
  <div class="created-time-cell">
    <span class="cell-value">{{ formattedTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: number | null; // timestamp
}>();

const formattedTime = computed(() => {
  if (!props.value) {
    return '';
  }

  const date = new Date(props.value);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>

<style scoped>
.created-time-cell {
  width: 100%;
  min-height: 20px;
}

.cell-value {
  display: block;
  color: #6b7280;
  font-size: 13px;
}

.cell-value:empty::before {
  content: '—';
  color: #d1d5db;
}
</style>
