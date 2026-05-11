<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Редактирование карточки</h2>
        <button class="modal-close-btn" @click="$emit('close')" title="Закрыть">
          <span>✕</span>
        </button>
      </div>

      <div class="modal-body">
        <div v-for="column in editableColumns" :key="column.id" class="field-group">
          <label class="field-label">{{ column.name }}</label>
          <div class="field-input">
            <!-- TEXT -->
            <input
              v-if="column.type === 'TEXT'"
              v-model="formData[column.id]"
              type="text"
              class="input"
              :placeholder="`Введите ${column.name.toLowerCase()}`"
            />

            <!-- NUMBER -->
            <input
              v-else-if="column.type === 'NUMBER'"
              v-model.number="formData[column.id]"
              type="number"
              class="input"
              :placeholder="`Введите ${column.name.toLowerCase()}`"
            />

            <!-- DATE -->
            <input
              v-else-if="column.type === 'DATE'"
              v-model="formData[column.id]"
              type="date"
              class="input"
            />

            <!-- BOOLEAN -->
            <label v-else-if="column.type === 'BOOLEAN'" class="checkbox-label">
              <input
                v-model="formData[column.id]"
                type="checkbox"
                class="checkbox"
              />
              <span>{{ formData[column.id] ? 'Да' : 'Нет' }}</span>
            </label>

            <!-- SELECT -->
            <select
              v-else-if="column.type === 'SELECT'"
              v-model="formData[column.id]"
              class="select"
            >
              <option :value="null">Не выбрано</option>
              <option
                v-for="option in column.options"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>

            <!-- MULTI_SELECT -->
            <div v-else-if="column.type === 'MULTI_SELECT'" class="multi-select">
              <label
                v-for="option in column.options"
                :key="option.id"
                class="multi-select-option"
              >
                <input
                  type="checkbox"
                  :checked="isMultiSelectChecked(column.id, option.id)"
                  @change="toggleMultiSelect(column.id, option.id)"
                  class="checkbox"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>

            <!-- URL -->
            <input
              v-else-if="column.type === 'URL'"
              v-model="formData[column.id]"
              type="url"
              class="input"
              placeholder="https://example.com"
            />

            <!-- EMAIL -->
            <input
              v-else-if="column.type === 'EMAIL'"
              v-model="formData[column.id]"
              type="email"
              class="input"
              placeholder="email@example.com"
            />

            <!-- PHONE -->
            <input
              v-else-if="column.type === 'PHONE'"
              v-model="formData[column.id]"
              type="tel"
              class="input"
              placeholder="+7 (___) ___-__-__"
            />

            <!-- CREATED_TIME, LAST_EDITED_TIME (read-only) -->
            <input
              v-else-if="column.type === 'CREATED_TIME' || column.type === 'LAST_EDITED_TIME'"
              :value="formatTimestamp(formData[column.id])"
              type="text"
              class="input"
              readonly
              disabled
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-delete" @click="handleDelete">
          Удалить
        </button>
        <div class="footer-actions">
          <button class="btn btn-cancel" @click="$emit('close')">
            Отмена
          </button>
          <button class="btn btn-save" @click="handleSave">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Record, CustomDatabase } from '../../types';

interface Props {
  record: Record;
  database: CustomDatabase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  update: [recordId: string, data: { [columnId: string]: any }];
  delete: [recordId: string];
}>();

const formData = ref<{ [columnId: string]: any }>({});

// Колонки для редактирования (исключаем системные)
const editableColumns = computed(() => {
  return props.database.columns.filter(col => {
    // Исключаем неподдерживаемые типы
    return !['FILE', 'RELATION', 'FORMULA', 'PERSON'].includes(col.type);
  });
});

// Инициализация формы
onMounted(() => {
  formData.value = { ...props.record.data };
});

// Проверка для MULTI_SELECT
const isMultiSelectChecked = (columnId: string, optionId: string): boolean => {
  const value = formData.value[columnId];
  return Array.isArray(value) && value.includes(optionId);
};

// Переключение MULTI_SELECT
const toggleMultiSelect = (columnId: string, optionId: string) => {
  const currentValue = formData.value[columnId] || [];
  const newValue = Array.isArray(currentValue) ? [...currentValue] : [];

  if (newValue.includes(optionId)) {
    formData.value[columnId] = newValue.filter(id => id !== optionId);
  } else {
    formData.value[columnId] = [...newValue, optionId];
  }
};

// Форматирование timestamp
const formatTimestamp = (timestamp: number | null | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('ru-RU');
};

// Сохранить изменения
const handleSave = () => {
  emit('update', props.record.id, formData.value);
};

// Удалить карточку
const handleDelete = () => {
  if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
    emit('delete', props.record.id);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dark .modal-container {
  background: #1f2937;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .modal-header {
  border-bottom-color: #374151;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.dark .modal-title {
  color: #f9fafb;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  font-size: 20px;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .modal-close-btn:hover {
  background: #374151;
  color: #e5e7eb;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dark .modal-body::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.field-group {
  margin-bottom: 20px;
}

.field-group:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.dark .field-label {
  color: #e5e7eb;
}

.field-input {
  width: 100%;
}

.input,
.select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  background: white;
  transition: all 0.15s ease;
}

.dark .input,
.dark .select {
  background: #111827;
  border-color: #4b5563;
  color: #f9fafb;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.dark .input:disabled {
  background: #374151;
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #374151;
}

.dark .checkbox-label {
  color: #e5e7eb;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.multi-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.multi-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #374151;
}

.dark .multi-select-option {
  background: #111827;
  border-color: #4b5563;
  color: #e5e7eb;
}

.multi-select-option:hover {
  background: #eff6ff;
  border-color: #3b82f6;
}

.dark .multi-select-option:hover {
  background: #1e3a5f;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.dark .modal-footer {
  border-top-color: #374151;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.dark .btn-cancel {
  background: #374151;
  color: #e5e7eb;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.dark .btn-cancel:hover {
  background: #4b5563;
}

.btn-save {
  background: #3b82f6;
  color: white;
}

.btn-save:hover {
  background: #2563eb;
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
}

.dark .btn-delete {
  background: #7f1d1d;
  color: #fca5a5;
}

.btn-delete:hover {
  background: #fecaca;
}

.dark .btn-delete:hover {
  background: #991b1b;
}
</style>
