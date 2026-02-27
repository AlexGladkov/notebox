<template>
  <div class="text-cell" @click="startEdit">
    <input
      v-if="editing"
      v-model="editedValue"
      ref="inputRef"
      class="cell-input"
      @blur="saveEdit"
      @keydown.enter="saveEdit"
      @keydown.esc="cancelEdit"
    />
    <span v-else class="cell-value">{{ displayValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

const editing = ref(false);
const editedValue = ref(props.value || '');
const inputRef = ref<HTMLInputElement | null>(null);

const displayValue = computed(() => props.value || '');

const startEdit = async () => {
  editing.value = true;
  editedValue.value = props.value || '';

  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const saveEdit = () => {
  emit('update', editedValue.value);
  editing.value = false;
};

const cancelEdit = () => {
  editedValue.value = props.value || '';
  editing.value = false;
};
</script>

<style scoped>
.text-cell {
  width: 100%;
  min-height: 20px;
  cursor: text;
}

.cell-value {
  display: block;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

.cell-value:empty::before {
  content: 'Пусто';
  color: #d1d5db;
}

.cell-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  color: #374151;
  font-size: inherit;
  font-family: inherit;
  padding: 0;
}
</style>
