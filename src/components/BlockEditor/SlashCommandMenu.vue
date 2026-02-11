<template>
  <div
    v-if="visible && filteredCommands.length > 0"
    class="slash-command-menu"
    :style="{ top: position.top + 'px', left: position.left + 'px' }"
  >
    <div
      v-for="(command, index) in filteredCommands"
      :key="command.id"
      :class="['command-item', { active: index === selectedIndex }]"
      @click="selectCommand(command)"
      @mouseenter="selectedIndex = index"
    >
      <span class="command-icon">{{ command.icon }}</span>
      <div class="command-info">
        <div class="command-title">{{ command.title }}</div>
        <div class="command-description">{{ command.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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

const selectCommand = (command: SlashCommand) => {
  command.command(props.editor);
  emit('commandSelected');
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.visible || filteredCommands.value.length === 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length;
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value =
      selectedIndex.value === 0
        ? filteredCommands.value.length - 1
        : selectedIndex.value - 1;
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const command = filteredCommands.value[selectedIndex.value];
    if (command) {
      selectCommand(command);
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    emit('commandSelected');
    return;
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

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
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
</style>
