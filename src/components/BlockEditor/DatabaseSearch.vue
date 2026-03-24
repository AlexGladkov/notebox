<template>
  <div class="database-search">
    <button
      v-if="!expanded"
      class="search-button"
      @click="expand"
      title="Поиск"
    >
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
    <div v-else class="search-input-container">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref="searchInput"
        v-model="query"
        class="search-input"
        placeholder="Поиск..."
        @blur="handleBlur"
      />
      <button
        v-if="query"
        class="clear-button"
        @click="clear"
        title="Очистить"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const expanded = ref(false);
const query = ref(props.modelValue);
const searchInput = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (newQuery) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    emit('update:modelValue', newQuery);
  }, 300);
});

watch(() => props.modelValue, (newValue) => {
  query.value = newValue;
  if (newValue) {
    expanded.value = true;
  }
});

const expand = async () => {
  expanded.value = true;
  await nextTick();
  searchInput.value?.focus();
};

const handleBlur = () => {
  if (!query.value) {
    expanded.value = false;
  }
};

const clear = () => {
  query.value = '';
  emit('update:modelValue', '');
  searchInput.value?.focus();
};

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<style scoped>
.database-search {
  display: flex;
  align-items: center;
}

.search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  color: #6b7280;
}

.dark .search-button {
  color: #9ca3af;
}

.search-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .search-button:hover {
  background: #374151;
  color: #e5e7eb;
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.dark .search-input-container {
  background: #111827;
  border-color: #374151;
}

.search-input-container:focus-within {
  background: white;
  border-color: #3b82f6;
}

.dark .search-input-container:focus-within {
  background: #1f2937;
  border-color: #3b82f6;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: none;
  outline: none;
  padding: 0;
  font-size: 14px;
  color: #111827;
  min-width: 150px;
}

.dark .search-input {
  color: #f9fafb;
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 20px;
  color: #9ca3af;
  line-height: 1;
  width: 20px;
  height: 20px;
}

.clear-button:hover {
  color: #6b7280;
}

.dark .clear-button:hover {
  color: #d1d5db;
}
</style>
