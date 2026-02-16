<template>
  <div v-if="icon || showActions" class="note-icon-wrapper" @mouseenter="showActions = true" @mouseleave="showActions = false">
    <div v-if="icon" class="note-icon" @click="togglePicker">
      <span class="icon-emoji">{{ icon }}</span>
      <div v-if="showActions" class="icon-actions" @click.stop>
        <button class="action-btn" @click="togglePicker" title="Изменить иконку">
          Изменить
        </button>
        <button class="action-btn remove-btn" @click="removeIcon" title="Удалить иконку">
          Удалить
        </button>
      </div>
    </div>

    <button v-else-if="showActions" class="add-icon-btn" @click="togglePicker">
      <span class="icon">📝</span>
      <span>Добавить иконку</span>
    </button>

    <EmojiPicker
      :is-open="pickerOpen"
      @select="selectEmoji"
      @close="pickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EmojiPicker from './EmojiPicker.vue'

interface Props {
  icon?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [icon: string | null]
}>()

const showActions = ref(false)
const pickerOpen = ref(false)

const togglePicker = () => {
  pickerOpen.value = !pickerOpen.value
}

const selectEmoji = (emoji: string) => {
  emit('update', emoji)
  pickerOpen.value = false
}

const removeIcon = () => {
  emit('update', null)
}
</script>

<style scoped>
.note-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.note-icon {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.icon-emoji {
  font-size: 78px;
  line-height: 1;
  display: block;
  user-select: none;
  transition: transform 0.2s;
}

.icon-emoji:hover {
  transform: scale(1.05);
}

.icon-actions {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0;
  animation: fadeIn 0.2s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.action-btn {
  padding: 4px 8px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--bg-hover);
}

.remove-btn:hover {
  background: var(--danger-color);
  color: white;
}

.add-icon-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-icon-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--bg-hover);
}

.add-icon-btn .icon {
  font-size: 16px;
}
</style>
