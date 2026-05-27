<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50" @click.self="$emit('cancel')">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
      <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{{ title }}</h3>
      <p class="text-gray-600 dark:text-gray-300 mb-4">{{ message }}</p>

      <!-- Детали о дочерних страницах -->
      <div v-if="details?.childrenCount" class="details-section mb-6">
        <p class="warning-text mb-3">
          Также будут удалены {{ details.childrenCount }} {{ getChildrenWord(details.childrenCount) }}:
        </p>
        <ul v-if="details.itemsList && details.itemsList.length > 0" class="items-list">
          <li v-for="(item, index) in details.itemsList.slice(0, 5)" :key="index" class="list-item">
            {{ truncateText(item, 50) }}
          </li>
          <li v-if="details.itemsList.length > 5" class="list-item-more">
            ...и ещё {{ details.itemsList.length - 5 }}
          </li>
        </ul>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Отмена
        </button>
        <button
          @click="$emit('confirm')"
          :class="[
            'px-4 py-2 text-white rounded-md transition-colors',
            confirmVariant === 'warning'
              ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800'
              : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
          ]"
        >
          {{ confirmLabel || 'Удалить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

interface ConfirmDialogDetails {
  childrenCount?: number;
  itemsList?: string[];
}

const props = defineProps<{
  show: boolean;
  title: string;
  message: string;
  details?: ConfirmDialogDetails;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('cancel');
  }
};

const getChildrenWord = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дочерних страниц';
  }

  if (lastDigit === 1) {
    return 'дочерняя страница';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дочерние страницы';
  }

  return 'дочерних страниц';
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.details-section {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px 16px;
}

.dark .details-section {
  background-color: #7f1d1d;
  border-color: #991b1b;
}

.warning-text {
  font-size: 14px;
  font-weight: 500;
  color: #991b1b;
}

.dark .warning-text {
  color: #fca5a5;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  font-size: 13px;
  color: #7f1d1d;
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.list-item::before {
  content: '•';
  position: absolute;
  left: 4px;
  color: #991b1b;
}

.dark .list-item {
  color: #fecaca;
}

.dark .list-item::before {
  color: #fca5a5;
}

.list-item-more {
  font-size: 13px;
  color: #7f1d1d;
  padding: 4px 0;
  padding-left: 16px;
  font-style: italic;
}

.dark .list-item-more {
  color: #fecaca;
}
</style>
