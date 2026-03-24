<template>
  <node-view-wrapper class="database-block">
    <div class="p-4 border rounded bg-gray-50 dark:bg-gray-800">
      <h3 class="text-lg font-bold mb-2">Database Block (Минимальная версия)</h3>
      <p>Database ID: {{ node?.attrs?.databaseId || 'undefined' }}</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Блок работает! Полная реализация будет добавлена позже.
      </p>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3';

interface Props {
  node?: {
    attrs?: {
      databaseId?: string;
    };
  };
}

const props = defineProps<Props>();
</script>

<style scoped>
.database-block {
  margin: 1rem 0;
}
</style>
