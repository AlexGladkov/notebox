<template>
  <div
    v-if="icon || showAddButton"
    class="note-icon-wrapper"
    :class="{ 'has-icon': icon }"
    @mouseenter="showDeleteBtn = true"
    @mouseleave="showDeleteBtn = false"
  >
    <div v-if="icon" class="note-icon" @click="togglePicker">
      <span class="icon-emoji">{{ icon }}</span>
      <button
        v-if="showDeleteBtn"
        class="delete-btn"
        @click.stop="removeIcon"
        title="Удалить иконку"
      >
        ×
      </button>
    </div>

    <button v-else class="add-icon-btn" @click="togglePicker">
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
  showAddButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAddButton: true,
})

const emit = defineEmits<{
  update: [icon: string | null]
}>()

const showDeleteBtn = ref(false)
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

.delete-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 18px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  animation: fadeIn 0.2s forwards;
}

.delete-btn:hover {
  background: var(--danger-color);
  transform: scale(1.1);
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
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
</style>
