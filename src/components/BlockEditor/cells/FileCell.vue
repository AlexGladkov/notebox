<template>
  <div class="file-cell" @click="startEdit">
    <div v-if="value" class="file-link">
      <a :href="value" target="_blank" rel="noopener noreferrer" @click.stop>
        📎 {{ displayName }}
      </a>
    </div>
    <input
      v-else-if="editing"
      v-model="editedValue"
      ref="inputRef"
      class="cell-input"
      placeholder="Вставьте URL файла..."
      @blur="saveEdit"
      @keydown.enter="saveEdit"
      @keydown.esc="cancelEdit"
    />
    <span v-else class="cell-value empty">Добавить ссылку</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = defineProps<{
  value: string | null; // URL
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

const editing = ref(false);
const editedValue = ref(props.value || '');
const inputRef = ref<HTMLInputElement | null>(null);

const displayName = computed(() => {
  if (!props.value) return '';
  try {
    const url = new URL(props.value);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename || url.hostname;
  } catch {
    return props.value;
  }
});

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
.file-cell {
  width: 100%;
  min-height: 20px;
  cursor: pointer;
}

.file-link a {
  color: #3b82f6;
  text-decoration: none;
}

.file-link a:hover {
  text-decoration: underline;
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
