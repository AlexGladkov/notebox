<template>
  <Teleport to="body">
    <Transition name="palette">
      <div
        v-if="isOpen"
        class="command-palette-overlay"
        @click.self="close"
      >
        <div class="command-palette" role="dialog" aria-modal="true" aria-label="Командная палитра">
          <!-- Header with search input -->
          <div class="palette-header">
            <span class="search-icon">🔍</span>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="palette-input"
              placeholder="Введите команду или название заметки..."
              aria-label="Поиск команд и заметок"
              @keydown.down.prevent="navigateDown"
              @keydown.up.prevent="navigateUp"
              @keydown.enter.prevent="executeSelected"
              @keydown.esc="close"
              @input="resetSelection"
            />
          </div>

          <!-- Results -->
          <div class="palette-content">
            <template v-if="sections.length > 0">
              <div v-for="section in sections" :key="section.id" class="palette-section">
                <div class="section-title">{{ section.title }}</div>
                <div
                  v-for="item in section.items"
                  :key="item.id"
                  :class="[
                    'palette-item',
                    { 'palette-item-active': isSelected(item) }
                  ]"
                  role="button"
                  tabindex="0"
                  @click="executeItem(item)"
                  @mouseenter="selectItemByInstance(item)"
                >
                  <span class="item-icon">{{ item.icon }}</span>
                  <div class="item-content">
                    <div class="item-title">{{ item.title }}</div>
                    <div v-if="item.description" class="item-description">
                      {{ item.description }}
                    </div>
                  </div>
                  <span v-if="item.shortcut" class="item-shortcut">
                    {{ item.shortcut }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Empty state -->
            <div v-else class="palette-empty">
              <span class="empty-icon">🔍</span>
              <p class="empty-text">Ничего не найдено</p>
              <p class="empty-hint">Попробуйте другой запрос</p>
            </div>
          </div>

          <!-- Footer with hint -->
          <div class="palette-footer">
            <span class="footer-hint">
              <kbd>↑</kbd> <kbd>↓</kbd> для навигации
              <span class="separator">•</span>
              <kbd>Enter</kbd> для выбора
              <span class="separator">•</span>
              <kbd>Esc</kbd> для закрытия
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useCommandPalette } from '../composables/useCommandPalette';
import type { CommandPaletteItem } from '../types/commandPalette';

const {
  isOpen,
  query,
  sections,
  allItems,
  selectedIndex,
  selectedItem,
  close,
  executeItem,
  navigateUp,
  navigateDown,
  executeSelected,
  resetSelection,
} = useCommandPalette();

const inputRef = ref<HTMLInputElement | null>(null);

// Фокус на input при открытии
watch(isOpen, (newValue) => {
  if (newValue) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

// Проверка, выбран ли элемент
const isSelected = (item: CommandPaletteItem): boolean => {
  return selectedItem.value?.id === item.id;
};

// Выбор элемента по наведению мыши
const selectItemByInstance = (item: CommandPaletteItem): void => {
  const index = allItems.value.findIndex(i => i.id === item.id);
  if (index !== -1) {
    selectedIndex.value = index;
  }
};
</script>

<style scoped>
/* Overlay */
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  overflow-y: auto;
}

/* Command Palette */
.command-palette {
  width: 100%;
  max-width: 640px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

/* Dark theme */
:global(.dark) .command-palette {
  background: #1e1e1e;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

/* Header */
.palette-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

:global(.dark) .palette-header {
  border-bottom-color: #404040;
}

.search-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.palette-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #1f2937;
  background: transparent;
}

.palette-input::placeholder {
  color: #9ca3af;
}

:global(.dark) .palette-input {
  color: #e5e7eb;
}

:global(.dark) .palette-input::placeholder {
  color: #6b7280;
}

/* Content */
.palette-content {
  overflow-y: auto;
  max-height: calc(70vh - 120px);
}

/* Section */
.palette-section {
  padding: 8px 0;
}

.palette-section:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

:global(.dark) .palette-section:not(:last-child) {
  border-bottom-color: #404040;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  padding: 8px 16px;
}

:global(.dark) .section-title {
  color: #9ca3af;
}

/* Item */
.palette-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.palette-item:hover {
  background: #f3f4f6;
}

.palette-item-active {
  background: #e0e7ff;
  border-left: 3px solid #6366f1;
}

:global(.dark) .palette-item:hover {
  background: #2a2a2a;
}

:global(.dark) .palette-item-active {
  background: #312e81;
  border-left: 3px solid #818cf8;
}

.item-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.dark) .item-title {
  color: #e5e7eb;
}

.item-description {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.dark) .item-description {
  color: #9ca3af;
}

.item-shortcut {
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  font-family: monospace;
  flex-shrink: 0;
  margin-left: 12px;
}

:global(.dark) .item-shortcut {
  color: #9ca3af;
  background: #2a2a2a;
}

/* Empty state */
.palette-empty {
  padding: 48px 16px;
  text-align: center;
  color: #6b7280;
}

:global(.dark) .palette-empty {
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.8;
}

/* Footer */
.palette-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

:global(.dark) .palette-footer {
  border-top-color: #404040;
  background: #1a1a1a;
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

:global(.dark) .footer-hint {
  color: #9ca3af;
}

.footer-hint kbd {
  padding: 2px 6px;
  border-radius: 4px;
  background: white;
  border: 1px solid #d1d5db;
  font-family: monospace;
  font-size: 11px;
}

:global(.dark) .footer-hint kbd {
  background: #2a2a2a;
  border-color: #404040;
}

.separator {
  color: #d1d5db;
}

:global(.dark) .separator {
  color: #404040;
}

/* Transitions */
.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.2s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-active .command-palette,
.palette-leave-active .command-palette {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.palette-enter-from .command-palette,
.palette-leave-to .command-palette {
  transform: scale(0.95) translateY(-20px);
  opacity: 0;
}
</style>
