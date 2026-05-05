<template>
  <div
    v-if="visible && filteredCommands.length > 0"
    class="slash-command-menu"
    :style="{ top: position.top + 'px', left: position.left + 'px' }"
  >
    <template v-for="(group, groupIndex) in groupedCommands" :key="group.category">
      <!-- Category header -->
      <div v-if="group.category" class="category-header">
        {{ group.category }}
      </div>

      <!-- Commands in this category -->
      <div
        v-for="command in group.commands"
        :key="command.id"
        :class="['command-item', {
          active: getCommandGlobalIndex(command) === selectedIndex,
          loading: command.loading
        }]"
        @click="selectCommand(command)"
        @mouseenter="selectedIndex = getCommandGlobalIndex(command)"
      >
        <span class="command-icon">
          <span v-if="command.loading" class="loading-spinner">⏳</span>
          <span v-else>{{ command.icon }}</span>
        </span>
        <div class="command-info">
          <div class="command-title">{{ command.title }}</div>
          <div class="command-description">{{ command.description }}</div>
        </div>
      </div>

      <!-- Divider between categories (not after last category) -->
      <div v-if="groupIndex < groupedCommands.length - 1" class="category-divider"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../types/editor';

const props = defineProps<{
  editor: Editor;
  visible: boolean;
  query: string;
  commands: SlashCommand[];
}>();

const emit = defineEmits<{
  commandSelected: [];
}>();

const selectedIndex = ref(0);
const position = ref({ top: 0, left: 0 });

const filteredCommands = computed(() => {
  if (!props.query) {
    return props.commands;
  }

  const lowerQuery = props.query.toLowerCase();
  return props.commands.filter((cmd) => {
    const matchesTitle = cmd.title.toLowerCase().includes(lowerQuery);
    const matchesDescription = cmd.description.toLowerCase().includes(lowerQuery);
    const matchesKeywords = cmd.keywords?.some((kw) =>
      kw.toLowerCase().includes(lowerQuery)
    );

    return matchesTitle || matchesDescription || matchesKeywords;
  });
});

// Group commands by category
interface CommandGroup {
  category: string;
  commands: SlashCommand[];
}

const groupedCommands = computed<CommandGroup[]>(() => {
  const groups = new Map<string, SlashCommand[]>();

  // Define category order
  const categoryOrder = [
    'Базовые блоки',
    'Списки',
    'Форматирование',
    'Выноски',
    'Вставки',
    'AI действия',
  ];

  // Group commands by category
  filteredCommands.value.forEach((cmd) => {
    const category = cmd.category || 'Другое';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(cmd);
  });

  // Convert to ordered array
  const result: CommandGroup[] = [];
  categoryOrder.forEach((category) => {
    if (groups.has(category)) {
      result.push({
        category,
        commands: groups.get(category)!,
      });
      groups.delete(category);
    }
  });

  // Add remaining categories (if any)
  groups.forEach((commands, category) => {
    result.push({ category, commands });
  });

  return result;
});

// Get global index of a command (for navigation)
const getCommandGlobalIndex = (command: SlashCommand): number => {
  return filteredCommands.value.findIndex((cmd) => cmd.id === command.id);
};

const selectCommand = (command: SlashCommand) => {
  command.command(props.editor);
  emit('commandSelected');
};

const navigateDown = () => {
  if (filteredCommands.value.length === 0) return;
  selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length;
};

const navigateUp = () => {
  if (filteredCommands.value.length === 0) return;
  selectedIndex.value =
    selectedIndex.value === 0
      ? filteredCommands.value.length - 1
      : selectedIndex.value - 1;
};

const selectCurrent = () => {
  if (filteredCommands.value.length === 0) return;
  const command = filteredCommands.value[selectedIndex.value];
  if (command) {
    selectCommand(command);
  }
};

const updatePosition = () => {
  if (!props.editor) return;

  const { selection } = props.editor.state;
  const coords = props.editor.view.coordsAtPos(selection.from);

  position.value = {
    top: coords.bottom + 8,
    left: coords.left,
  };
};

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      selectedIndex.value = 0;
      updatePosition();
    }
  }
);

watch(
  () => props.query,
  () => {
    selectedIndex.value = 0;
  }
);

// Expose methods to parent component
defineExpose({
  navigateUp,
  navigateDown,
  selectCurrent,
});
</script>

<style scoped>
.slash-command-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  max-width: 320px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.command-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.command-item:hover,
.command-item.active {
  background-color: #f3f4f6;
}

.command-icon {
  flex-shrink: 0;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
}

.command-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.category-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
}

.category-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}

.command-item.loading {
  opacity: 0.6;
  cursor: wait;
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
/* Dark theme */
.dark .slash-command-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.dark .command-item:hover,
.dark .command-item.active {
  background-color: #374151;
}

.dark .command-title {
  color: #f9fafb;
}

.dark .command-description {
  color: #9ca3af;
}

.dark .category-header {
  color: #6b7280;
}

.dark .category-divider {
  background-color: #374151;
}
</style>
