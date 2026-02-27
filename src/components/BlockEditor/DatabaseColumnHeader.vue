<template>
  <div class="column-header" @click="toggleMenu">
    <input
      v-if="editing"
      v-model="editedName"
      class="column-name-input"
      @click.stop
      @blur="saveEdit"
      @keydown.enter="saveEdit"
      @keydown.esc="cancelEdit"
      ref="inputRef"
    />
    <span v-else class="column-name">{{ column.name }}</span>
    <span class="column-type-icon">{{ getTypeIcon(column.type) }}</span>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="column-menu"
      @click.stop
    >
      <div class="column-menu-item" @click="startEdit">
        <span class="menu-icon">✏️</span>
        <span>Переименовать</span>
      </div>

      <div class="column-menu-divider"></div>

      <div class="column-menu-section-title">Изменить тип</div>

      <div
        v-for="type in columnTypes"
        :key="type.value"
        class="column-menu-item"
        :class="{ active: column.type === type.value }"
        @click="changeType(type.value)"
      >
        <span class="menu-icon">{{ type.icon }}</span>
        <span>{{ type.label }}</span>
      </div>

      <div class="column-menu-divider"></div>

      <div class="column-menu-item danger" @click="deleteColumn">
        <span class="menu-icon">🗑️</span>
        <span>Удалить колонку</span>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="menuVisible"
      class="column-menu-overlay"
      @click="closeMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Column, ColumnType } from '../../types';

const props = defineProps<{
  column: Column;
}>();

const emit = defineEmits<{
  update: [columnId: string, name: string, type: ColumnType, options?: any];
  delete: [columnId: string];
}>();

const menuVisible = ref(false);
const editing = ref(false);
const editedName = ref(props.column.name);
const inputRef = ref<HTMLInputElement | null>(null);

const columnTypes = [
  { value: 'TEXT', label: 'Текст', icon: '📝' },
  { value: 'NUMBER', label: 'Число', icon: '#️⃣' },
  { value: 'BOOLEAN', label: 'Чекбокс', icon: '☑️' },
  { value: 'DATE', label: 'Дата', icon: '📅' },
  { value: 'SELECT', label: 'Выбор', icon: '🏷️' },
  { value: 'MULTI_SELECT', label: 'Множественный выбор', icon: '🏷️' },
  { value: 'RELATION', label: 'Связь', icon: '🔗' },
  { value: 'FORMULA', label: 'Формула', icon: 'ƒ' },
  { value: 'FILE', label: 'Файл', icon: '📎' },
  { value: 'PERSON', label: 'Персона', icon: '👤' },
  { value: 'URL', label: 'URL', icon: '🔗' },
  { value: 'EMAIL', label: 'Email', icon: '📧' },
  { value: 'PHONE', label: 'Телефон', icon: '📞' },
  { value: 'CREATED_TIME', label: 'Время создания', icon: '🕐' },
  { value: 'LAST_EDITED_TIME', label: 'Время изменения', icon: '🕐' },
];

const getTypeIcon = (type: ColumnType): string => {
  const typeInfo = columnTypes.find(t => t.value === type);
  return typeInfo ? typeInfo.icon : '📝';
};

const toggleMenu = () => {
  if (!editing.value) {
    menuVisible.value = !menuVisible.value;
  }
};

const closeMenu = () => {
  menuVisible.value = false;
};

const startEdit = async () => {
  editing.value = true;
  editedName.value = props.column.name;
  closeMenu();

  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

const saveEdit = () => {
  if (editedName.value.trim() && editedName.value !== props.column.name) {
    emit('update', props.column.id, editedName.value.trim(), props.column.type, props.column.options);
  }
  editing.value = false;
};

const cancelEdit = () => {
  editedName.value = props.column.name;
  editing.value = false;
};

const changeType = (newType: ColumnType) => {
  if (newType !== props.column.type) {
    emit('update', props.column.id, props.column.name, newType, props.column.options);
  }
  closeMenu();
};

const deleteColumn = () => {
  emit('delete', props.column.id);
  closeMenu();
};
</script>

<style scoped>
.column-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  position: relative;
  user-select: none;
}

.column-header:hover {
  background: #f3f4f6;
}

.column-name {
  flex: 1;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.column-name-input {
  flex: 1;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  padding: 4px 6px;
  font-weight: 500;
  color: #374151;
  outline: none;
  background: white;
}

.column-type-icon {
  font-size: 14px;
  opacity: 0.7;
}

/* Menu Styles */
.column-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.column-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 220px;
  max-height: 400px;
  overflow-y: auto;
}

.column-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  color: #374151;
  font-size: 14px;
}

.column-menu-item:hover {
  background: #f3f4f6;
}

.column-menu-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.column-menu-item.danger {
  color: #dc2626;
}

.column-menu-item.danger:hover {
  background: #fef2f2;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.column-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.column-menu-section-title {
  padding: 8px 12px 4px;
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
