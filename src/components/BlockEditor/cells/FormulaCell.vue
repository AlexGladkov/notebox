<template>
  <div class="formula-cell">
    <span class="cell-value">{{ computedValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: any; // Computed formula result
}>();

// Formula cells are read-only, displaying the computed value
const computedValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '';
  }
  if (typeof props.value === 'number') {
    return props.value.toLocaleString('ru-RU');
  }
  return String(props.value);
});
</script>

<style scoped>
.formula-cell {
  width: 100%;
  min-height: 20px;
}

.cell-value {
  display: block;
  color: #6b7280;
  font-style: italic;
}

.cell-value:empty::before {
  content: '—';
  color: #d1d5db;
}
</style>
