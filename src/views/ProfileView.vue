<template>
  <div class="flex flex-col h-screen bg-white dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-4">
        <button
          @click="goBack"
          class="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Назад</span>
        </button>
      </div>

      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Профиль
      </h1>

      <div class="w-24"></div>
    </div>

    <!-- Profile Content -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto py-8">
        <ProfileSection v-if="user" :user="user" />
        <div v-else class="flex items-center justify-center h-64">
          <p class="text-gray-500 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import ProfileSection from '../components/settings/ProfileSection.vue';

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);

const goBack = () => {
  router.back();
};
</script>

<style scoped>
/* Styles are mostly handled by utility classes and ProfileSection component */
</style>
