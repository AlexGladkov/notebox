<template>
  <div class="settings-section">
    <div class="section-header">
      <h2 class="section-title">Настройки дневника</h2>
      <p class="section-description">
        Настройте шаблон для автоматически создаваемых дневных заметок
      </p>
    </div>

    <div class="section-content">
      <!-- Шаблон дневной заметки -->
      <div class="setting-group">
        <label class="setting-label">
          Шаблон дневной заметки
          <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
            Используйте <code v-pre>{{date}}</code> для вставки даты
          </span>
        </label>
        <textarea
          v-model="template"
          @input="debouncedSave"
          class="template-textarea"
          rows="12"
          :placeholder="`# {{date}}

## Сегодня
-

## Заметки

`"
        />
        <p class="setting-hint">
          Этот шаблон будет использоваться при создании новых дневных заметок.
          Переменная <code v-pre>{{date}}</code> будет заменена на текущую дату в формате DD.MM.YYYY.
        </p>
      </div>

      <!-- Предпросмотр -->
      <div class="setting-group">
        <label class="setting-label">Предпросмотр</label>
        <div class="preview-container">
          <div class="preview-content">
            {{ previewContent }}
          </div>
        </div>
        <p class="setting-hint">
          Так будет выглядеть содержимое новой дневной заметки
        </p>
      </div>

      <!-- Действия -->
      <div class="setting-group">
        <div class="flex gap-3">
          <button
            @click="resetToDefault"
            class="btn-secondary"
          >
            Сбросить к значениям по умолчанию
          </button>
          <button
            @click="saveTemplate"
            class="btn-primary"
          >
            Сохранить шаблон
          </button>
        </div>
        <p v-if="saveStatus" class="save-status">
          {{ saveStatus }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDailyNotes } from '../../composables/useDailyNotes';

const { getTemplate, saveTemplate: saveToDailyNotes, formatDisplayDate } = useDailyNotes();

const template = ref('');
const saveStatus = ref('');
let saveTimeout: number | null = null;

const DEFAULT_TEMPLATE = `# {{date}}

## Сегодня
-

## Заметки

`;

// Предпросмотр с подставленной датой
const previewContent = computed(() => {
  const today = new Date();
  return template.value.replace('{{date}}', formatDisplayDate(today));
});

// Сохранение с задержкой
const debouncedSave = () => {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveTemplate();
  }, 1000) as unknown as number;
};

// Сохранить шаблон
const saveTemplate = () => {
  try {
    saveToDailyNotes(template.value);
    saveStatus.value = '✓ Шаблон сохранён';

    setTimeout(() => {
      saveStatus.value = '';
    }, 3000);
  } catch (error) {
    console.error('Не удалось сохранить шаблон:', error);
    saveStatus.value = '✗ Ошибка сохранения';
  }
};

// Сбросить к значениям по умолчанию
const resetToDefault = () => {
  template.value = DEFAULT_TEMPLATE;
  saveTemplate();
};

// Загрузить текущий шаблон при монтировании
onMounted(() => {
  template.value = getTemplate();
});
</script>

<style scoped>
.settings-section {
  padding: 32px;
  max-width: 800px;
}

.section-header {
  margin-bottom: 32px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.section-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: baseline;
}

.setting-hint {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.setting-hint code,
.setting-label code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 12px;
  color: #dc2626;
}

.template-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
  color: #111827;
  background: white;
  transition: border-color 0.2s;
}

.template-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.preview-container {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.preview-content {
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: #374151;
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.save-status {
  font-size: 13px;
  color: #059669;
  margin: 8px 0 0 0;
}

@media (max-width: 768px) {
  .settings-section {
    padding: 20px;
  }

  .section-title {
    font-size: 20px;
  }

  .template-textarea {
    font-size: 12px;
  }

  .flex {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>

<style>
/* Dark theme styles - unscoped */
.dark .section-title {
  color: #f9fafb;
}

.dark .section-description {
  color: #9ca3af;
}

.dark .setting-label {
  color: #e5e7eb;
}

.dark .setting-hint {
  color: #9ca3af;
}

.dark .setting-hint code,
.dark .setting-label code {
  background: #374151;
  color: #fca5a5;
}

.dark .template-textarea {
  background: #111827;
  border-color: #374151;
  color: #f3f4f6;
}

.dark .template-textarea:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.dark .preview-container {
  background: #111827;
  border-color: #374151;
}

.dark .preview-content {
  color: #e5e7eb;
}

.dark .btn-secondary {
  background: #374151;
  color: #e5e7eb;
  border-color: #4b5563;
}

.dark .btn-secondary:hover {
  background: #4b5563;
}
</style>
