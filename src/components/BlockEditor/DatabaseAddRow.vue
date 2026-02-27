<template>
  <div class="add-row-wrapper">
    <button class="add-row-btn" @click="addRow">
      <span class="add-icon">+</span>
      <span>Новая запись</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  add: [];
}>();

const addRow = () => {
  emit('add');
};
</script>

<style scoped>
.add-row-wrapper {
  margin-top: 8px;
  padding-left: 12px;
}

.add-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.add-row-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.add-icon {
  font-size: 16px;
  font-weight: 600;
}
</style>
