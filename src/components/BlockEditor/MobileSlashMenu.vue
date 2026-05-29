<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="visible && filteredCommands.length > 0"
        ref="menuRef"
        class="mobile-slash-menu fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
      >
        <!-- Swipe handle -->
        <div class="flex justify-center py-2 border-b border-gray-200 dark:border-gray-700">
          <div class="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        <!-- Search query display -->
        <div v-if="query" class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-sm text-gray-500 dark:text-gray-400">Поиск: </span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ query }}</span>
        </div>

        <!-- Commands list -->
        <div class="overflow-y-auto max-h-[60vh]">
          <template v-for="(group, groupIndex) in groupedCommands" :key="group.category">
            <!-- Category header -->
            <div v-if="group.category" class="category-header">
              {{ group.category }}
            </div>

            <!-- Commands in this category -->
            <button
              v-for="command in group.commands"
              :key="command.id"
              :class="['command-item', {
                active: getCommandGlobalIndex(command) === selectedIndex
              }]"
              @click="selectCommand(command)"
            >
              <span class="command-icon">{{ command.icon }}</span>
              <div class="command-info">
                <div class="command-title">{{ command.title }}</div>
                <div class="command-description">{{ command.description }}</div>
              </div>
            </button>

            <!-- Divider between categories (not after last category) -->
            <div v-if="groupIndex < groupedCommands.length - 1" class="category-divider"></div>
          </template>
        </div>

        <!-- Close button -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            class="w-full touch-target bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
            @click="$emit('close')"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Transition>

    <!-- Overlay -->
    <Transition name="fade">
      <div
        v-if="visible && filteredCommands.length > 0"
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        @click="$emit('close')"
      ></div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { SlashCommand } from '../../types/editor';
import { useSwipe } from '../../composables/useSwipe';

const props = defineProps<{
  editor: Editor;
  visible: boolean;
  query: string;
  commands: SlashCommand[];
}>();

const emit = defineEmits<{
  commandSelected: [];
  close: [];
}>();

const selectedIndex = ref(0);
const menuRef = ref<HTMLElement | null>(null);

// Swipe down to close
useSwipe(menuRef, {
  threshold: 50,
  onSwipeDown: () => {
    emit('close');
  },
});

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

interface CommandGroup {
  category: string;
  commands: SlashCommand[];
}

const groupedCommands = computed<CommandGroup[]>(() => {
  const groups = new Map<string, SlashCommand[]>();

  const categoryOrder = [
    'Базовые блоки',
    'Списки',
    'Форматирование',
    'Выноски',
    'Вставки',
    'AI действия',
  ];

  filteredCommands.value.forEach((cmd) => {
    const category = cmd.category || 'Другое';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(cmd);
  });

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

  groups.forEach((commands, category) => {
    result.push({ category, commands });
  });

  return result;
});

const getCommandGlobalIndex = (command: SlashCommand): number => {
  return filteredCommands.value.findIndex((cmd) => cmd.id === command.id);
};

const selectCommand = (command: SlashCommand) => {
  command.command(props.editor);
  emit('commandSelected');
};

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      selectedIndex.value = 0;
    }
  }
);

watch(
  () => props.query,
  () => {
    selectedIndex.value = 0;
  }
);
</script>

<style scoped>
.mobile-slash-menu {
  max-height: 80vh;
}

.touch-target {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  cursor: pointer;
  border: none;
  background: none;
  text-align: left;
  transition: background-color 0.15s ease;
  min-height: 56px;
}

.command-item:hover,
.command-item.active {
  background-color: #f3f4f6;
}

.dark .command-item:hover,
.dark .command-item.active {
  background-color: #374151;
}

.command-icon {
  flex-shrink: 0;
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-title {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.dark .command-title {
  color: #f9fafb;
}

.command-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.dark .command-description {
  color: #9ca3af;
}

.category-header {
  padding: 12px 16px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
}

.dark .category-header {
  color: #6b7280;
}

.category-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 8px 16px;
}

.dark .category-divider {
  background-color: #374151;
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
