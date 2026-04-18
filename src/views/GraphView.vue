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
          <span>Назад к заметкам</span>
        </button>
      </div>

      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Граф связей страниц
      </h1>

      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ graphData.nodes.length }} {{ getPagesWord(graphData.nodes.length) }},
          {{ graphData.edges.length }} {{ getConnectionsWord(graphData.edges.length) }}
        </span>
      </div>
    </div>

    <!-- Graph Canvas -->
    <div class="flex-1 relative">
      <!-- Пустое состояние -->
      <div
        v-if="graphData.nodes.length === 0"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-center">
          <svg
            class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Нет страниц для отображения
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Создайте страницы, чтобы увидеть граф связей
          </p>
        </div>
      </div>

      <!-- Loading состояние -->
      <div
        v-else-if="isCalculating"
        class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50"
      >
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Построение графа...</p>
        </div>
      </div>

      <!-- Canvas -->
      <GraphCanvas
        v-else
        ref="canvasRef"
        :graph-data="graphData"
        :is-dark-mode="isDarkMode"
        @node-click="handleNodeClick"
      />

      <!-- Controls -->
      <GraphControls
        v-if="graphData.nodes.length > 0"
        @zoom-in="handleZoomIn"
        @zoom-out="handleZoomOut"
        @reset-view="handleResetView"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { notesApi } from '../api';
import type { Note } from '../types';
import { useGraph } from '../composables/useGraph';
import GraphCanvas from '../components/graph/GraphCanvas.vue';
import GraphControls from '../components/graph/GraphControls.vue';

const router = useRouter();
const notes = ref<Note[]>([]);
const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null);

// Определяем темную тему с реактивным отслеживанием
const isDarkMode = ref(document.documentElement.classList.contains('dark'));

// Наблюдаем за изменениями темы
let themeObserver: MutationObserver | null = null;

// Используем composable для графа
const layoutWidth = ref(1200);
const layoutHeight = ref(800);
const { graphData, isCalculating, recalculateLayout } = useGraph(notes, layoutWidth, layoutHeight);

/**
 * Загрузка всех заметок
 */
async function loadNotes() {
  try {
    const allNotes = await notesApi.getAll();
    notes.value = allNotes;
    recalculateLayout();
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
}

/**
 * Возврат к основному виду
 */
function goBack() {
  router.push('/');
}

/**
 * Обработка клика по ноде
 */
function handleNodeClick(nodeId: string) {
  // Открываем страницу и возвращаемся к основному виду
  router.push(`/?note=${nodeId}`);
}

/**
 * Управление zoom
 */
function handleZoomIn() {
  canvasRef.value?.zoomIn();
}

function handleZoomOut() {
  canvasRef.value?.zoomOut();
}

function handleResetView() {
  canvasRef.value?.resetView();
}

/**
 * Склонение слова "страница"
 */
function getPagesWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'страниц';
  }

  if (lastDigit === 1) {
    return 'страница';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'страницы';
  }

  return 'страниц';
}

/**
 * Склонение слова "связь"
 */
function getConnectionsWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'связей';
  }

  if (lastDigit === 1) {
    return 'связь';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'связи';
  }

  return 'связей';
}

onMounted(() => {
  loadNotes();

  // Наблюдаем за изменениями класса 'dark' на documentElement
  themeObserver = new MutationObserver(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark');
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

onUnmounted(() => {
  if (themeObserver) {
    themeObserver.disconnect();
  }
});
</script>
