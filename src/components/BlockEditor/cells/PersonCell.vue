<template>
  <div class="person-cell" @click="startEdit">
    <div v-if="value && !editing" class="person-tag">
      <span class="person-icon">👤</span>
      <span>{{ value }}</span>
    </div>
    <input
      v-else-if="editing"
      v-model="editedValue"
      ref="inputRef"
      class="cell-input"
      placeholder="Введите имя..."
      @blur="saveEdit"
      @keydown.enter="saveEdit"
      @keydown.esc="cancelEdit"
    />
    <span v-else class="cell-value empty">Добавить персону</span>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

const props = defineProps<{
  value: string | null;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

const editing = ref(false);
const editedValue = ref(props.value || '');
const inputRef = ref<HTMLInputElement | null>(null);

const startEdit = async () => {
  editing.value = true;
  editedValue.value = props.value || '';

  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const saveEdit = () => {
  if (editedValue.value.trim()) {
    emit('update', editedValue.value.trim());
  }
  editing.value = false;
};

const cancelEdit = () => {
  editedValue.value = props.value || '';
  editing.value = false;
};
</script>

<style scoped>
.person-cell {
  width: 100%;
  min-height: 20px;
  cursor: pointer;
}

.person-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  color: #374151;
}

.person-icon {
  font-size: 14px;
}

.cell-value.empty {
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
