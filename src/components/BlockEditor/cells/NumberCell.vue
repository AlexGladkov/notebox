<template>
  <div class="number-cell" @click="startEdit">
    <input
      v-if="editing"
      v-model="editedValue"
      ref="inputRef"
      type="number"
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
  value: number | null;
}>();

const emit = defineEmits<{
  update: [value: number | null];
}>();

const editing = ref(false);
const editedValue = ref<string>(props.value !== null && props.value !== undefined ? String(props.value) : '');
const inputRef = ref<HTMLInputElement | null>(null);

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '';
  }
  return String(props.value);
});

const startEdit = async () => {
  editing.value = true;
  editedValue.value = props.value !== null && props.value !== undefined ? String(props.value) : '';

  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const saveEdit = () => {
  const strValue = String(editedValue.value ?? '').trim();
  const numValue = strValue === '' ? null : parseFloat(strValue);
  emit('update', numValue);
  editing.value = false;
};

const cancelEdit = () => {
  editedValue.value = props.value !== null && props.value !== undefined ? String(props.value) : '';
  editing.value = false;
};
</script>

<style scoped>
.number-cell {
  width: 100%;
  min-height: 20px;
  cursor: text;
}

.cell-value {
  display: block;
  color: #374151;
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
