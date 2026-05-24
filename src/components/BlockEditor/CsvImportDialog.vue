<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50" @click.self="handleCancel">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" @click.stop>
      <!-- Header -->
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Импорт CSV
      </h3>

      <!-- Step 1: File Upload -->
      <div v-if="step === 'upload'" class="space-y-4">
        <div
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          ]"
          @click="fileInput?.click()"
        >
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Перетащите CSV файл сюда или кликните для выбора
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Максимальный размер: 5 МБ, максимум 10,000 строк
          </p>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>

        <div v-if="uploadError" class="text-sm text-red-600 dark:text-red-400">
          {{ uploadError }}
        </div>
      </div>

      <!-- Step 2: Preview and Mapping -->
      <div v-if="step === 'mapping'" class="space-y-4">
        <!-- Import Mode -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Режим импорта
          </label>
          <div class="flex gap-4">
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="importMode"
                value="append"
                class="mr-2"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Добавить к существующим записям
              </span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="importMode"
                value="replace"
                class="mr-2"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Заменить все записи
              </span>
            </label>
          </div>
          <div v-if="importMode === 'replace'" class="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ Все существующие записи будут удалены перед импортом
          </div>
        </div>

        <!-- Column Mapping -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Сопоставление колонок
          </label>
          <div class="space-y-2">
            <div
              v-for="(header, index) in csvHeaders"
              :key="index"
              class="flex items-center gap-3"
            >
              <div class="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {{ header }}
              </div>
              <div class="flex-1">
                <select
                  v-model="columnMapping[index]"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option :value="null">Пропустить</option>
                  <option v-for="col in columns" :key="col.id" :value="col.id">
                    {{ col.name }} ({{ getColumnTypeLabel(col.type) }})
                  </option>
                  <option value="__new__">Создать новую колонку</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Предпросмотр (первые 5 строк)
          </label>
          <div class="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-md">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    v-for="(header, index) in csvHeaders"
                    :key="index"
                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
                  <td
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                  >
                    {{ cell || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Parse Errors -->
        <div v-if="parseErrors.length > 0" class="space-y-2">
          <label class="text-sm font-medium text-orange-600 dark:text-orange-400">
            Предупреждения при парсинге
          </label>
          <div class="text-xs text-orange-600 dark:text-orange-400 space-y-1">
            <div v-for="(error, index) in parseErrors.slice(0, 5)" :key="index">
              Строка {{ error.line }}: {{ error.message }}
            </div>
            <div v-if="parseErrors.length > 5">
              ... и ещё {{ parseErrors.length - 5 }} предупреждений
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Будет импортировано строк: {{ csvRows.length }}
        </div>
      </div>

      <!-- Step 3: Progress -->
      <div v-if="step === 'importing'" class="space-y-4">
        <div class="flex items-center justify-center py-8">
          <div class="text-center space-y-3">
            <div class="loading-spinner mx-auto"></div>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Импорт данных... {{ importProgress }}/{{ csvRows.length }}
            </p>
          </div>
        </div>
      </div>

      <!-- Step 4: Result -->
      <div v-if="step === 'result'" class="space-y-4">
        <div class="text-center py-6">
          <div v-if="importErrors.length === 0" class="space-y-3">
            <svg class="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100">
              Импорт завершён успешно!
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Импортировано записей: {{ importedCount }}
            </p>
          </div>
          <div v-else class="space-y-3">
            <svg class="mx-auto h-12 w-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100">
              Импорт завершён с ошибками
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Успешно: {{ importedCount }}, Ошибок: {{ importErrors.length }}
            </p>
            <div class="mt-4 text-xs text-left text-orange-600 dark:text-orange-400 max-h-32 overflow-y-auto">
              <div v-for="(error, index) in importErrors.slice(0, 10)" :key="index">
                Строка {{ error.line }}: {{ error.message }}
              </div>
              <div v-if="importErrors.length > 10">
                ... и ещё {{ importErrors.length - 10 }} ошибок
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          v-if="step === 'upload' || step === 'mapping'"
          @click="handleCancel"
          class="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Отмена
        </button>
        <button
          v-if="step === 'mapping'"
          @click="handleBack"
          class="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Назад
        </button>
        <button
          v-if="step === 'mapping'"
          @click="handleImport"
          :disabled="!canImport"
          :class="[
            'px-4 py-2 rounded-md transition-colors',
            canImport
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
          ]"
        >
          Импортировать
        </button>
        <button
          v-if="step === 'result'"
          @click="handleClose"
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { Column, ColumnType } from '../../types';
import { parseCsv, detectColumnTypes, convertCsvValue, validateCsvSize, validateCsvRowCount } from '../../utils/csvParser';
import type { CsvParseError } from '../../utils/csvParser';

interface Props {
  show: boolean;
  columns: Column[];
}

interface ImportError {
  line: number;
  message: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  cancel: [];
  import: [data: ImportData];
}>();

export interface ImportData {
  mode: 'append' | 'replace';
  records: Array<{ [columnId: string]: any }>;
  newColumns?: Array<{ name: string; type: ColumnType }>;
  tempColumnIds?: Map<string, number>; // Map временный ID -> индекс в newColumns
}

const step = ref<'upload' | 'mapping' | 'importing' | 'result'>('upload');
const isDragging = ref(false);
const uploadError = ref<string | null>(null);
const importMode = ref<'append' | 'replace'>('append');

const csvHeaders = ref<string[]>([]);
const csvRows = ref<string[][]>([]);
const parseErrors = ref<CsvParseError[]>([]);
const columnMapping = ref<(string | null)[]>([]);

const importProgress = ref(0);
const importedCount = ref(0);
const importErrors = ref<ImportError[]>([]);

const fileInput = ref<HTMLInputElement | null>(null);

const previewRows = computed(() => csvRows.value.slice(0, 5));

const canImport = computed(() => {
  // Проверяем, что хотя бы одна колонка выбрана
  return columnMapping.value.some(mapping => mapping !== null);
});

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && (step.value === 'upload' || step.value === 'mapping')) {
    handleCancel();
  }
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

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    processFile(input.files[0]);
  }
};

const processFile = async (file: File) => {
  uploadError.value = null;

  // Проверяем тип файла
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    uploadError.value = 'Пожалуйста, выберите CSV файл';
    return;
  }

  try {
    const content = await file.text();

    // Валидация размера
    const sizeValidation = validateCsvSize(content);
    if (!sizeValidation.valid) {
      uploadError.value = sizeValidation.error || 'Файл слишком большой';
      return;
    }

    // Парсинг
    const result = parseCsv(content);

    if (result.headers.length === 0) {
      uploadError.value = 'CSV файл не содержит заголовков';
      return;
    }

    // Валидация количества строк
    const rowValidation = validateCsvRowCount(result.rows);
    if (!rowValidation.valid) {
      uploadError.value = rowValidation.error || 'Слишком много строк';
      return;
    }

    // Сохраняем данные
    csvHeaders.value = result.headers;
    csvRows.value = result.rows;
    parseErrors.value = result.errors;

    // Автоматическое определение типов колонок

    // Инициализируем маппинг колонок
    columnMapping.value = result.headers.map((header, _index) => {
      // Пытаемся найти существующую колонку с таким же названием
      const existingColumn = props.columns.find(col =>
        col.name.toLowerCase() === header.toLowerCase()
      );

      if (existingColumn) {
        return existingColumn.id;
      }

      // Если не нашли, предлагаем создать новую
      return '__new__';
    });

    step.value = 'mapping';
  } catch (err) {
    console.error('Failed to process CSV file:', err);
    uploadError.value = err instanceof Error ? err.message : 'Ошибка обработки файла';
  }
};

const handleBack = () => {
  step.value = 'upload';
  csvHeaders.value = [];
  csvRows.value = [];
  parseErrors.value = [];
  columnMapping.value = [];
  uploadError.value = null;
};

const handleCancel = () => {
  emit('cancel');
  resetDialog();
};

const handleClose = () => {
  emit('cancel');
  resetDialog();
};

const handleImport = async () => {
  if (!canImport.value) return;

  step.value = 'importing';
  importProgress.value = 0;
  importedCount.value = 0;
  importErrors.value = [];

  try {
    const records: Array<{ [columnId: string]: any }> = [];
    const newColumns: Array<{ name: string; type: ColumnType }> = [];

    // Собираем новые колонки
    const newColumnIndices: Map<number, string> = new Map();
    const tempColumnIds: Map<string, number> = new Map(); // Map временный ID -> индекс в newColumns
    columnMapping.value.forEach((mapping, index) => {
      if (mapping === '__new__') {
        const columnName = csvHeaders.value[index];
        const columnType = detectColumnTypes([columnName], [csvRows.value.map(row => row[index])])[0];
        const columnId = `new-col-${Date.now()}-${index}`;
        const newColIndex = newColumns.length;
        newColumns.push({ name: columnName, type: columnType });
        newColumnIndices.set(index, columnId);
        tempColumnIds.set(columnId, newColIndex);
      }
    });

    // Обрабатываем строки
    for (let i = 0; i < csvRows.value.length; i++) {
      const row = csvRows.value[i];
      importProgress.value = i + 1;

      try {
        const recordData: { [columnId: string]: any } = {};

        columnMapping.value.forEach((mapping, colIndex) => {
          if (mapping === null) return;

          const csvValue = row[colIndex];
          let columnId: string;
          let columnType: ColumnType;

          let columnOptions: any[] | undefined;

          if (mapping === '__new__') {
            columnId = newColumnIndices.get(colIndex)!;
            const newCol = newColumns.find(c => c.name === csvHeaders.value[colIndex]);
            columnType = newCol?.type || 'TEXT';
            columnOptions = undefined; // Новые колонки пока не имеют options
          } else {
            columnId = mapping;
            const column = props.columns.find(c => c.id === columnId);
            columnType = column?.type || 'TEXT';
            columnOptions = column?.options;
          }

          recordData[columnId] = convertCsvValue(csvValue, columnType, columnOptions);
        });

        records.push(recordData);
        importedCount.value++;
      } catch (err) {
        importErrors.value.push({
          line: i + 2, // +2 because of header and 0-index
          message: err instanceof Error ? err.message : 'Ошибка преобразования данных',
        });
      }
    }

    // Эмитим данные для импорта
    emit('import', {
      mode: importMode.value,
      records,
      newColumns: newColumns.length > 0 ? newColumns : undefined,
      tempColumnIds: tempColumnIds.size > 0 ? tempColumnIds : undefined,
    });

    step.value = 'result';
  } catch (err) {
    console.error('Import failed:', err);
    importErrors.value.push({
      line: 0,
      message: err instanceof Error ? err.message : 'Неизвестная ошибка импорта',
    });
    step.value = 'result';
  }
};

const resetDialog = () => {
  step.value = 'upload';
  isDragging.value = false;
  uploadError.value = null;
  importMode.value = 'append';
  csvHeaders.value = [];
  csvRows.value = [];
  parseErrors.value = [];
  columnMapping.value = [];
  importProgress.value = 0;
  importedCount.value = 0;
  importErrors.value = [];
};

const getColumnTypeLabel = (type: ColumnType): string => {
  const labels: Record<ColumnType, string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    BOOLEAN: 'Да/Нет',
    DATE: 'Дата',
    SELECT: 'Выбор',
    MULTI_SELECT: 'Множественный выбор',
    FILE: 'Файл',
    RELATION: 'Связь',
    FORMULA: 'Формула',
    PERSON: 'Человек',
    URL: 'URL',
    EMAIL: 'Email',
    PHONE: 'Телефон',
    CREATED_TIME: 'Время создания',
    LAST_EDITED_TIME: 'Время изменения',
  };
  return labels[type] || type;
};
</script>

<style scoped>
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.dark .loading-spinner {
  border-color: #374151;
  border-top-color: #60a5fa;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
