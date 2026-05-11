<template>
  <div class="datetime-picker">
    <div class="flex gap-2">
      <input
        type="date"
        :value="dateValue"
        @input="handleDateChange"
        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <input
        type="time"
        :value="timeValue"
        @input="handleTimeChange"
        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    <div v-if="optional" class="mt-2">
      <button
        @click="clear"
        class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Очистить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: number;
  optional?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined];
}>();

const dateValue = computed(() => {
  if (!props.modelValue) {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
  const date = new Date(props.modelValue);
  return date.toISOString().split('T')[0];
});

const timeValue = computed(() => {
  if (!props.modelValue) {
    return '12:00';
  }
  const date = new Date(props.modelValue);
  return date.toTimeString().slice(0, 5);
});

const handleDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const dateStr = target.value;
  const currentTime = timeValue.value;
  const timestamp = new Date(`${dateStr}T${currentTime}`).getTime();
  emit('update:modelValue', timestamp);
};

const handleTimeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const timeStr = target.value;
  const currentDate = dateValue.value;
  const timestamp = new Date(`${currentDate}T${timeStr}`).getTime();
  emit('update:modelValue', timestamp);
};

const clear = () => {
  emit('update:modelValue', undefined);
};
</script>

<style scoped>
.datetime-picker {
  width: 100%;
}

/* Стили для dark mode автоматически применяются через Tailwind */
</style>
