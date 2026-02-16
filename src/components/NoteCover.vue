<template>
  <div
    v-if="backdropType || showActions"
    class="note-cover"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <div
      v-if="backdropType"
      class="cover-image"
      :class="{ repositioning }"
      :style="coverStyle"
      @mousedown="startReposition"
    >
      <div v-if="showActions && !repositioning" class="cover-actions">
        <button class="action-btn" @click="openPicker" title="Изменить обложку">
          Изменить обложку
        </button>
        <button
          class="action-btn"
          @click="toggleReposition"
          title="Изменить позицию"
        >
          Reposition
        </button>
        <button
          class="action-btn remove-btn"
          @click="removeCover"
          title="Удалить обложку"
        >
          Удалить
        </button>
      </div>

      <div v-if="repositioning" class="reposition-hint">
        Перетащите изображение для изменения позиции
        <button class="done-btn" @click="finishReposition">Готово</button>
      </div>
    </div>

    <button v-else-if="showActions" class="add-cover-btn" @click="openPicker">
      <span class="icon">🖼️</span>
      <span>Добавить обложку</span>
    </button>

    <CoverPicker
      :is-open="pickerOpen"
      @select="selectCover"
      @close="pickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import CoverPicker from './CoverPicker.vue'

interface Props {
  backdropType?: string | null
  backdropValue?: string | null
  backdropPositionY?: number
}

const props = withDefaults(defineProps<Props>(), {
  backdropPositionY: 50,
})

const emit = defineEmits<{
  update: [type: string | null, value: string | null, positionY: number]
}>()

const showActions = ref(false)
const pickerOpen = ref(false)
const repositioning = ref(false)
const currentPositionY = ref(props.backdropPositionY)
const dragStartY = ref(0)
const dragStartPosition = ref(0)

// Ссылки на обработчики для cleanup
let cleanupDragHandlers: (() => void) | null = null

// Обновление currentPositionY при изменении props
watch(() => props.backdropPositionY, (newValue) => {
  currentPositionY.value = newValue || 50
})

const coverStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.backdropType === 'gradient') {
    // Градиенты должны начинаться с 'linear-gradient('
    const value = props.backdropValue || ''
    if (value.startsWith('linear-gradient(')) {
      style.background = value
    }
  } else if (props.backdropType === 'image') {
    // Валидация URL
    const value = props.backdropValue || ''
    try {
      // Проверяем, что это валидный URL (http/https)
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        style.backgroundImage = `url("${value}")`
        style.backgroundSize = 'cover'
        style.backgroundPosition = `center ${currentPositionY.value}%`
      }
    } catch {
      // Невалидный URL - игнорируем
    }
  }

  return style
})

const openPicker = () => {
  pickerOpen.value = true
}

const selectCover = (type: string, value: string) => {
  emit('update', type, value, 50)
}

const removeCover = () => {
  emit('update', null, null, 50)
}

const toggleReposition = () => {
  if (props.backdropType !== 'image') return
  repositioning.value = true
}

const startReposition = (event: MouseEvent) => {
  if (!repositioning.value || props.backdropType !== 'image') return

  dragStartY.value = event.clientY
  dragStartPosition.value = currentPositionY.value

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.clientY - dragStartY.value
    const percentChange = (deltaY / 200) * 100
    currentPositionY.value = Math.max(
      0,
      Math.min(100, dragStartPosition.value + percentChange)
    )
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    cleanupDragHandlers = null
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Сохраняем функцию очистки для onUnmounted
  cleanupDragHandlers = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}

const finishReposition = () => {
  repositioning.value = false
  emit('update', props.backdropType, props.backdropValue, currentPositionY.value)
}

// Cleanup при размонтировании компонента
onUnmounted(() => {
  if (cleanupDragHandlers) {
    cleanupDragHandlers()
  }
})
</script>

<style scoped>
.note-cover {
  position: relative;
  margin: -24px -24px 24px -24px;
}

.cover-image {
  width: 100%;
  height: 200px;
  position: relative;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  background-position: center;
  background-size: cover;
}

.cover-image.repositioning {
  cursor: move;
}

.cover-actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  animation: fadeIn 0.2s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.action-btn {
  padding: 6px 12px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  backdrop-filter: blur(8px);
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.85);
}

.remove-btn:hover {
  background: var(--danger-color);
}

.reposition-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  text-align: center;
  backdrop-filter: blur(8px);
}

.done-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  background: var(--primary-color);
  color: white;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.done-btn:hover {
  opacity: 0.9;
}

.add-cover-btn {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed var(--border-color);
  border-radius: 8px 8px 0 0;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-cover-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--bg-hover);
}

.add-cover-btn .icon {
  font-size: 32px;
}
</style>
