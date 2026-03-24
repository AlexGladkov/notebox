<template>
  <div class="database-toolbar">
    <div class="toolbar-left">
      <DatabaseFilter
        v-model="currentFilter"
        :columns="columns"
        @update:model-value="handleFilterChange"
      />
      <DatabaseSort
        v-model="currentSort"
        :columns="columns"
        @update:model-value="handleSortChange"
      />
      <DatabaseSearch
        v-model="currentSearch"
        @update:model-value="handleSearchChange"
      />
    </div>
    <div class="toolbar-right">
      <button
        class="toolbar-button"
        @click="handleShare"
        title="Поделиться ссылкой"
      >
        <svg class="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="showToast" class="toast">
        Ссылка скопирована в буфер обмена
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import DatabaseFilter from './DatabaseFilter.vue';
import DatabaseSort from './DatabaseSort.vue';
import DatabaseSearch from './DatabaseSearch.vue';
import type { Column } from '../../types';
import type { DatabaseFilter as FilterType, DatabaseSort as SortType } from '../../types/database';

defineProps<{
  columns: Column[];
}>();

const emit = defineEmits<{
  'filter-change': [filter: FilterType | null];
  'sort-change': [sort: SortType | null];
  'search-change': [query: string];
}>();

const currentFilter = ref<FilterType | null>(null);
const currentSort = ref<SortType | null>(null);
const currentSearch = ref('');
const showToast = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const handleFilterChange = (filter: FilterType | null) => {
  emit('filter-change', filter);
};

const handleSortChange = (sort: SortType | null) => {
  emit('sort-change', sort);
};

const handleSearchChange = (query: string) => {
  emit('search-change', query);
};

const handleShare = async () => {
  try {
    // Проверяем доступность Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(window.location.href);
    } else {
      // Fallback для браузеров без поддержки Clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    showToast.value = true;
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      showToast.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL:', err);
    alert('Не удалось скопировать ссылку');
  }
};

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
});
</script>

<style scoped>
.database-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  gap: 12px;
  position: relative;
}

.dark .database-toolbar {
  background: #1f2937;
  border-bottom-color: #374151;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  color: #6b7280;
}

.dark .toolbar-button {
  background: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

.toolbar-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.dark .toolbar-button:hover {
  background: #111827;
  border-color: #4b5563;
  color: #e5e7eb;
}

.button-icon {
  width: 16px;
  height: 16px;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 2000;
}

.dark .toast {
  background: #f9fafb;
  color: #111827;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
