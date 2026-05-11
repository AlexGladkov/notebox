<template>
  <div class="kanban-column">
    <div class="column-header" :style="{ borderTopColor: headerColor }">
      <div class="column-title">
        <span class="column-name">{{ columnName }}</span>
        <span class="column-count">{{ records.length }}</span>
      </div>
      <div class="column-actions">
        <button
          class="column-btn"
          @click="handleAddCard"
          title="Добавить карточку"
        >
          <span>+</span>
        </button>
        <button
          v-if="collapsible"
          class="column-btn"
          @click="$emit('toggle-collapse')"
          :title="collapsed ? 'Развернуть' : 'Свернуть'"
        >
          <span>{{ collapsed ? '›' : '‹' }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="!collapsed"
      class="column-content"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div v-if="records.length === 0" class="column-empty">
        <span>Нет карточек</span>
      </div>
      <KanbanCard
        v-for="record in records"
        :key="record.id"
        :record="record"
        :database="database"
        :card-fields="cardFields"
        @click="$emit('card-click', record.id)"
        @delete="$emit('card-delete', record.id)"
        @drag-start="handleCardDragStart"
        @drag-end="handleCardDragEnd"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import KanbanCard from './KanbanCard.vue';
import type { Record, CustomDatabase, SelectOption } from '../../types';
import { TAG_COLOR_PALETTE } from '../../types/database';

interface Props {
  option: SelectOption | null; // null для "Без статуса"
  records: Record[];
  database: CustomDatabase;
  collapsed?: boolean;
  collapsible?: boolean;
  cardFields?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  collapsible: false,
  cardFields: () => [],
});

const emit = defineEmits<{
  drop: [recordId: string, optionId: string | null];
  'toggle-collapse': [];
  'add-card': [optionId: string | null];
  'card-click': [recordId: string];
  'card-delete': [recordId: string];
}>();

const isDragOver = ref(false);
const isDragging = ref(false);

const columnName = computed(() => {
  return props.option?.label || 'Без статуса';
});

const headerColor = computed(() => {
  if (!props.option?.color) return '#d1d5db';

  const colorDef = TAG_COLOR_PALETTE.find(c => c.name === props.option!.color);
  return colorDef?.dark || '#d1d5db';
});

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  if (!isDragging.value) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  // Проверяем, что мы действительно покинули column-content
  const target = event.target as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (!target.closest('.column-content')?.contains(relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  if (!event.dataTransfer) return;

  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'));
    const recordId = data.recordId;

    if (recordId) {
      emit('drop', recordId, props.option?.id || null);
    }
  } catch (err) {
    console.error('Failed to parse drag data:', err);
  }
};

const handleCardDragStart = () => {
  isDragging.value = true;
};

const handleCardDragEnd = () => {
  isDragging.value = false;
  isDragOver.value = false;
};

const handleAddCard = () => {
  emit('add-card', props.option?.id || null);
};
</script>

<style scoped>
.kanban-column {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 280px;
  max-height: 100%;
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.dark .kanban-column {
  background: #111827;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: white;
  border-top: 3px solid;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.dark .column-header {
  background: #1f2937;
  border-bottom-color: #374151;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.column-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .column-name {
  color: #f9fafb;
}

.column-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.dark .column-count {
  color: #9ca3af;
  background: #374151;
}

.column-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.column-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  transition: all 0.15s ease;
}

.column-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .column-btn:hover {
  background: #374151;
  color: #e5e7eb;
}

.column-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 100px;
  transition: background-color 0.15s ease;
}

.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: transparent;
}

.column-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dark .column-content::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.column-content.drag-over {
  background: #eff6ff;
}

.dark .column-content.drag-over {
  background: #1e3a5f;
}

.column-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}

.dark .column-empty {
  color: #6b7280;
}
</style>
