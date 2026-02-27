<template>
  <div class="boolean-cell" @click="toggle">
    <input
      type="checkbox"
      :checked="value"
      class="cell-checkbox"
      @click.stop="toggle"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: boolean;
}>();

const emit = defineEmits<{
  update: [value: boolean];
}>();

const toggle = () => {
  emit('update', !props.value);
};
</script>

<style scoped>
.boolean-cell {
  width: 100%;
  min-height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.cell-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}
</style>
