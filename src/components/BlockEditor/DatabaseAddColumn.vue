<template>
  <div class="add-column-btn" @click="toggleMenu">
    <span class="add-icon">+</span>

    <!-- Dropdown Menu -->
    <div
      v-if="menuVisible"
      class="add-column-menu"
      @click.stop
    >
      <div class="menu-title">Выберите тип колонки</div>

      <div
        v-for="type in columnTypes"
        :key="type.value"
        class="menu-item"
        @click="addColumn(type.value)"
      >
        <span class="menu-icon">{{ type.icon }}</span>
        <span>{{ type.label }}</span>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="menuVisible"
      class="menu-overlay"
      @click="closeMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ColumnType } from '../../types';

const emit = defineEmits<{
  add: [name: string, type: ColumnType];
}>();

const menuVisible = ref(false);

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

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const closeMenu = () => {
  menuVisible.value = false;
};

const addColumn = (type: ColumnType) => {
  const defaultNames: Record<ColumnType, string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    BOOLEAN: 'Чекбокс',
    DATE: 'Дата',
    SELECT: 'Выбор',
    MULTI_SELECT: 'Множественный выбор',
    RELATION: 'Связь',
    FORMULA: 'Формула',
    FILE: 'Файл',
    PERSON: 'Персона',
    URL: 'URL',
    EMAIL: 'Email',
    PHONE: 'Телефон',
    CREATED_TIME: 'Создано',
    LAST_EDITED_TIME: 'Изменено',
  };

  emit('add', defaultNames[type], type);
  closeMenu();
};
</script>

<style scoped>
.add-column-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  position: relative;
  color: #9ca3af;
  user-select: none;
}

.add-column-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.add-icon {
  font-size: 18px;
  font-weight: 600;
}

/* Menu Styles */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.add-column-menu {
  position: absolute;
  top: 100%;
  right: 0;
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

.menu-title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 4px;
}

.menu-item {
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

.menu-item:hover {
  background: #f3f4f6;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
