<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Удалить заметку?
      </h3>

      <p v-if="childrenCount === 0" class="text-gray-600 dark:text-gray-300 mb-6">
        Вы уверены, что хотите удалить эту заметку?
      </p>

      <div v-else class="mb-6">
        <p class="text-gray-600 dark:text-gray-300 mb-3">
          У этой заметки есть {{ childrenCount }} {{ getChildrenLabel(childrenCount) }}.
        </p>
        <p class="text-gray-600 dark:text-gray-300 mb-3">
          Что сделать с вложенными страницами?
        </p>

        <div class="space-y-2">
          <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="radio"
              name="deleteAction"
              value="cascade"
              v-model="selectedAction"
              class="mt-1"
            />
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">Удалить всё</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Удалить заметку и все вложенные страницы
              </div>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="radio"
              name="deleteAction"
              value="orphan"
              v-model="selectedAction"
              class="mt-1"
            />
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">Переместить страницы наверх</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Вложенные страницы переместятся к родителю удаляемой заметки
              </div>
            </div>
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Отмена
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors"
        >
          Удалить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  show: boolean;
  childrenCount: number;
}>();

const emit = defineEmits<{
  confirm: [cascadeDelete: boolean];
  cancel: [];
}>();

const selectedAction = ref<'cascade' | 'orphan'>('cascade');

watch(() => props.show, (newShow) => {
  if (newShow) {
    selectedAction.value = 'cascade';
  }
});

const handleConfirm = () => {
  const cascadeDelete = selectedAction.value === 'cascade';
  emit('confirm', cascadeDelete);
};

const getChildrenLabel = (count: number): string => {
  if (count === 1) return 'вложенная страница';
  if (count >= 2 && count <= 4) return 'вложенные страницы';
  return 'вложенных страниц';
};
</script>
