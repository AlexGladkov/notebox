<template>
  <div class="date-cell" @click="startEdit">
    <input
      v-if="editing"
      v-model="editedValue"
      ref="inputRef"
      type="datetime-local"
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
  value: number | null; // timestamp
}>();

const emit = defineEmits<{
  update: [value: number | null];
}>();

const editing = ref(false);
const editedValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timestampToDatetimeLocal = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 16);
};

const displayValue = computed(() => {
  if (!props.value) {
    return '';
  }
  return formatTimestamp(props.value);
});

const startEdit = async () => {
  editing.value = true;
  editedValue.value = props.value ? timestampToDatetimeLocal(props.value) : '';

  await nextTick();
  inputRef.value?.focus();
};

const saveEdit = () => {
  if (editedValue.value) {
    const timestamp = new Date(editedValue.value).getTime();
    emit('update', timestamp);
  } else {
    emit('update', null);
  }
  editing.value = false;
};

const cancelEdit = () => {
  editedValue.value = props.value ? timestampToDatetimeLocal(props.value) : '';
  editing.value = false;
};
</script>

<style scoped>
.date-cell {
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
