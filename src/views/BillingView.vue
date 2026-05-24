<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-4">
        <button
          @click="goBack"
          aria-label="Вернуться назад"
          class="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Назад</span>
        </button>
      </div>

      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Billing
      </h1>

      <div class="w-24"></div>
    </div>

    <!-- Billing Content -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto py-8 px-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center h-64">
          <p class="text-gray-500 dark:text-gray-400">Загрузка...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center h-64">
          <p class="text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <!-- Usage Stats -->
        <div v-else-if="usage" class="space-y-6">
          <!-- Plan Info -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Текущий план
            </h2>
            <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {{ usage.planType }}
            </p>
          </div>

          <!-- Usage Section -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Использование плана
            </h2>

            <div class="space-y-4">
              <!-- Databases Usage -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Проекты
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ usage.databases.current }} / {{ usage.databases.limit }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getDatabasesPercentage()}%` }"
                  ></div>
                </div>
              </div>

              <!-- Reminders Usage -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Параллельные задачи
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ usage.reminders.current }} / {{ usage.reminders.limit }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getRemindersPercentage()}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { billingApi, type BillingUsage } from '../api/billing';

const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const usage = ref<BillingUsage | null>(null);

const goBack = () => {
  router.back();
};

const getDatabasesPercentage = (): number => {
  if (!usage.value) return 0;
  return Math.min((usage.value.databases.current / usage.value.databases.limit) * 100, 100);
};

const getRemindersPercentage = (): number => {
  if (!usage.value) return 0;
  return Math.min((usage.value.reminders.current / usage.value.reminders.limit) * 100, 100);
};

const loadUsage = async () => {
  try {
    loading.value = true;
    error.value = null;
    usage.value = await billingApi.getUsage();
  } catch (err) {
    error.value = 'Не удалось загрузить данные о billing';
    console.error('Failed to load billing usage:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUsage();
});
</script>
