<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Создать новое представление</h2>
        <button class="modal-close-btn" @click="$emit('close')" title="Закрыть">
          <span>✕</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <label class="field-label">Название</label>
          <input
            v-model="viewName"
            type="text"
            class="input"
            placeholder="Введите название представления"
            @keypress.enter="handleCreate"
            ref="nameInput"
          />
        </div>

        <div class="field-group">
          <label class="field-label">Тип представления</label>
          <div class="view-types">
            <div
              class="view-type-card"
              :class="{ selected: viewType === 'table' }"
              @click="viewType = 'table'"
            >
              <div class="view-type-icon">📊</div>
              <div class="view-type-name">Таблица</div>
              <div class="view-type-desc">Табличное представление с колонками и строками</div>
            </div>

            <div
              class="view-type-card"
              :class="{ selected: viewType === 'kanban' }"
              @click="viewType = 'kanban'"
            >
              <div class="view-type-icon">📋</div>
              <div class="view-type-name">Kanban</div>
              <div class="view-type-desc">Доска с карточками, сгруппированными по колонкам</div>
            </div>
          </div>
        </div>

        <!-- Kanban-specific options -->
        <div v-if="viewType === 'kanban'" class="field-group">
          <label class="field-label">Группировать по колонке</label>
          <div v-if="!hasSelectColumns" class="warning-box">
            <span class="warning-icon">⚠️</span>
            <span>Для Kanban-представления требуется колонка типа SELECT или MULTI_SELECT. Создайте её в настройках базы данных.</span>
          </div>
          <select v-else v-model="groupByColumnId" class="select">
            <option :value="null">Выберите колонку...</option>
            <option
              v-for="col in selectColumns"
              :key="col.id"
              :value="col.id"
            >
              {{ col.name }} ({{ col.type }})
            </option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-cancel" @click="$emit('close')">
          Отмена
        </button>
        <button
          class="btn btn-create"
          @click="handleCreate"
          :disabled="!canCreate"
        >
          Создать
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { Column } from '../../types';
import type { ViewType } from '../../types/database';

interface Props {
  columns: Column[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  create: [name: string, type: ViewType, groupByColumnId?: string];
}>();

const viewName = ref('');
const viewType = ref<ViewType>('table');
const groupByColumnId = ref<string | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);

// SELECT/MULTI_SELECT колонки
const selectColumns = computed(() => {
  return props.columns.filter(
    col => col.type === 'SELECT' || col.type === 'MULTI_SELECT'
  );
});

const hasSelectColumns = computed(() => {
  return selectColumns.value.length > 0;
});

// Проверка возможности создания
const canCreate = computed(() => {
  if (!viewName.value.trim()) return false;
  if (viewType.value === 'kanban') {
    return hasSelectColumns.value && groupByColumnId.value !== null;
  }
  return true;
});

// Создать представление
const handleCreate = () => {
  if (!canCreate.value) return;

  if (viewType.value === 'kanban') {
    emit('create', viewName.value.trim(), viewType.value, groupByColumnId.value || undefined);
  } else {
    emit('create', viewName.value.trim(), viewType.value);
  }
};

// Фокус на поле ввода при монтировании
onMounted(() => {
  nextTick(() => {
    nameInput.value?.focus();
  });
});
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

.field-group {
  margin-bottom: 24px;
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

.view-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.view-type-card {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.dark .view-type-card {
  border-color: #374151;
}

.view-type-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.dark .view-type-card:hover {
  background: #1e3a5f;
}

.view-type-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.dark .view-type-card.selected {
  background: #1e3a5f;
}

.view-type-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.view-type-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.dark .view-type-name {
  color: #f9fafb;
}

.view-type-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.dark .view-type-desc {
  color: #9ca3af;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  color: #92400e;
  font-size: 13px;
  line-height: 1.5;
}

.dark .warning-box {
  background: #78350f;
  border-color: #92400e;
  color: #fef3c7;
}

.warning-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.dark .modal-footer {
  border-top-color: #374151;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-create {
  background: #3b82f6;
  color: white;
}

.btn-create:hover:not(:disabled) {
  background: #2563eb;
}
</style>
