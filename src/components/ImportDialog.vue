<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <!-- Заголовок -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ step === 'upload' ? 'Импорт Markdown файлов' : 'Предпросмотр импорта' }}
        </h2>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Контент -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Шаг 1: Загрузка файлов -->
        <div v-if="step === 'upload'" class="space-y-4">
          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
            :class="{ 'bg-blue-50 dark:bg-blue-900/20': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <div class="text-4xl mb-4">📁</div>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Перетащите файлы сюда или нажмите для выбора
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Поддерживаются .md файлы и .zip архивы с Markdown файлами
            </p>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept=".md,.zip"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <div v-if="uploadError" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-sm text-red-800 dark:text-red-200">{{ uploadError }}</p>
          </div>
        </div>

        <!-- Шаг 2: Превью и выбор файлов -->
        <div v-else-if="step === 'preview'" class="space-y-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <div class="text-2xl">ℹ️</div>
              <div class="flex-1">
                <p class="text-sm text-blue-900 dark:text-blue-100">
                  Найдено файлов: {{ preview?.totalFiles || 0 }}
                </p>
                <p v-if="preview?.hasWikiLinks" class="text-sm text-blue-900 dark:text-blue-100 mt-1">
                  ⚡ Обнаружены wiki-ссылки [[название]]. Они будут автоматически связаны с соответствующими заметками.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Выберите файлы для импорта
              </h3>
              <div class="flex gap-2">
                <button
                  @click="selectAll"
                  class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Выбрать все
                </button>
                <button
                  @click="deselectAll"
                  class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Снять все
                </button>
              </div>
            </div>

            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="file in preview?.files || []"
                :key="file.path"
                class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                :class="{ 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700': file.selected }"
                @click="toggleFileSelection(file.path)"
              >
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    :checked="file.selected"
                    class="mt-1"
                    @click.stop
                    @change="toggleFileSelection(file.path)"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {{ file.title }}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {{ file.path }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {{ file.contentPreview }}
                    </p>
                    <div v-if="file.wikiLinks.length > 0" class="mt-2 flex flex-wrap gap-1">
                      <span
                        v-for="link in file.wikiLinks.slice(0, 5)"
                        :key="link"
                        class="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded"
                      >
                        [[{{ link }}]]
                      </span>
                      <span
                        v-if="file.wikiLinks.length > 5"
                        class="text-xs text-gray-500 dark:text-gray-400"
                      >
                        +{{ file.wikiLinks.length - 5 }} еще
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Шаг 3: Импорт -->
        <div v-else-if="step === 'importing'" class="space-y-4">
          <div class="text-center py-8">
            <div class="text-4xl mb-4 animate-pulse">📦</div>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Импортируем файлы...
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Создано {{ importedCount }} из {{ selectedFilesCount }} файлов
            </p>
            <div class="mt-4 w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: importProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Шаг 4: Результат -->
        <div v-else-if="step === 'complete'" class="space-y-4">
          <div class="text-center py-8">
            <div class="text-4xl mb-4">✅</div>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Импорт завершен!
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Создано заметок: {{ importResult?.createdNotes.length || 0 }}
            </p>
          </div>

          <div v-if="importResult?.errors && importResult.errors.length > 0" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p class="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              Предупреждения ({{ importResult.errors.length }})
            </p>
            <ul class="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li v-for="(error, idx) in importResult.errors.slice(0, 5)" :key="idx">
                {{ error.file }}: {{ error.error }}
              </li>
              <li v-if="importResult.errors.length > 5" class="text-xs">
                +{{ importResult.errors.length - 5 }} еще...
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Футер -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
        <button
          v-if="step === 'upload' || step === 'complete'"
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {{ step === 'complete' ? 'Закрыть' : 'Отмена' }}
        </button>

        <button
          v-if="step === 'preview'"
          @click="step = 'upload'"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Назад
        </button>

        <button
          v-if="step === 'preview'"
          @click="handleImport"
          :disabled="selectedFilesCount === 0"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Импортировать ({{ selectedFilesCount }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  readZipFile,
  readMarkdownFile,
  createImportPreview,
  importFiles,
  type ImportFile,
  type ImportPreview,
  type ImportResult,
} from '../services/import/markdownImporter';
import type { Note } from '../types';

const props = withDefaults(defineProps<{
  visible: boolean;
  parentId?: string | null;
  createNoteFn?: (data: {
    title: string;
    content: string;
    parentId?: string | null;
    icon?: string | null;
  }) => Promise<Note>;
  updateNoteFn?: (id: string, updates: Partial<Note>) => Promise<void>;
}>(), {
  parentId: null,
});

const emit = defineEmits<{
  close: [];
  imported: [notes: Note[]];
}>();

type Step = 'upload' | 'preview' | 'importing' | 'complete';

const step = ref<Step>('upload');
const isDragging = ref(false);
const uploadError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const files = ref<ImportFile[]>([]);
const preview = ref<ImportPreview | null>(null);
const importResult = ref<ImportResult | null>(null);
const importedCount = ref(0);

const selectedFilesCount = computed(() => {
  return preview.value?.files.filter(f => f.selected).length || 0;
});

const importProgress = computed(() => {
  if (selectedFilesCount.value === 0) return 0;
  return Math.round((importedCount.value / selectedFilesCount.value) * 100);
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  await processFiles(Array.from(input.files));
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false;

  const droppedFiles = event.dataTransfer?.files;
  if (!droppedFiles || droppedFiles.length === 0) return;

  await processFiles(Array.from(droppedFiles));
}

async function processFiles(fileList: File[]) {
  uploadError.value = null;
  files.value = [];

  try {
    for (const file of fileList) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Обрабатываем ZIP архив
        const zipFiles = await readZipFile(file);
        files.value.push(...zipFiles);
      } else if (file.name.toLowerCase().endsWith('.md')) {
        // Обрабатываем отдельный Markdown файл
        const mdFile = await readMarkdownFile(file);
        files.value.push(mdFile);
      } else {
        uploadError.value = `Файл "${file.name}" не поддерживается. Используйте .md или .zip файлы.`;
        return;
      }
    }

    if (files.value.length === 0) {
      uploadError.value = 'Не найдено ни одного Markdown файла для импорта.';
      return;
    }

    // Создаем превью
    preview.value = await createImportPreview(files.value);
    step.value = 'preview';
  } catch (error) {
    console.error('Error processing files:', error);
    uploadError.value = error instanceof Error ? error.message : 'Ошибка при обработке файлов';
  }
}

function toggleFileSelection(path: string) {
  if (!preview.value) return;

  const file = preview.value.files.find(f => f.path === path);
  if (file) {
    file.selected = !file.selected;
  }
}

function selectAll() {
  if (!preview.value) return;
  preview.value.files.forEach(f => (f.selected = true));
}

function deselectAll() {
  if (!preview.value) return;
  preview.value.files.forEach(f => (f.selected = false));
}

async function handleImport() {
  if (!preview.value) return;

  step.value = 'importing';
  importedCount.value = 0;

  const selectedPaths = new Set(
    preview.value.files.filter(f => f.selected).map(f => f.path)
  );

  try {
    // Используем переданную функцию создания заметки или дефолтную
    const createNoteFn = props.createNoteFn || (async (data: {
      title: string;
      content: string;
      parentId?: string | null;
      icon?: string | null;
    }) => {
      // Fallback: создаем временную заметку для демонстрации
      importedCount.value++;

      const note: Note = {
        id: `temp-${Date.now()}-${Math.random()}`,
        title: data.title,
        content: data.content,
        parentId: data.parentId ?? null,
        icon: data.icon ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await new Promise(resolve => setTimeout(resolve, 50));
      return note;
    });

    // Оборачиваем функцию создания для отслеживания прогресса
    const wrappedCreateFn = async (data: {
      title: string;
      content: string;
      parentId?: string | null;
      icon?: string | null;
    }) => {
      const note = await createNoteFn(data);
      importedCount.value++;
      return note;
    };

    importResult.value = await importFiles(
      files.value,
      selectedPaths,
      props.parentId ?? null,
      wrappedCreateFn
    );

    // Обновляем контент заметок с wiki-ссылками, если есть функция обновления
    if (props.updateNoteFn && importResult.value.createdNotes.length > 0) {
      for (const note of importResult.value.createdNotes) {
        // Обновляем все заметки, чтобы сохранить обработанные wiki-ссылки
        try {
          await props.updateNoteFn(note.id, { content: note.content });
        } catch (error) {
          console.error(`Failed to update note ${note.id}:`, error);
        }
      }
    }

    step.value = 'complete';

    // Эмитим событие с созданными заметками
    emit('imported', importResult.value.createdNotes);
  } catch (error) {
    console.error('Import error:', error);
    uploadError.value = error instanceof Error ? error.message : 'Ошибка при импорте';
    step.value = 'preview';
  }
}

function handleClose() {
  // Сброс состояния
  step.value = 'upload';
  files.value = [];
  preview.value = null;
  importResult.value = null;
  uploadError.value = null;
  importedCount.value = 0;

  emit('close');
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
