<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="progress-overlay"
        @click.self="handleBackdropClick"
      >
        <div class="progress-card">
          <div class="progress-header">
            <h3 class="progress-title">{{ title }}</h3>
            <button
              v-if="canCancel"
              @click="handleCancel"
              class="cancel-button"
              aria-label="Отменить"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="progress-content">
            <!-- Progress Bar -->
            <div class="progress-bar-container">
              <div
                class="progress-bar-fill"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>

            <!-- Progress Text -->
            <div class="progress-text">
              <span class="progress-percent">{{ Math.round(progress) }}%</span>
              <span v-if="estimatedTime" class="progress-eta">
                Осталось: {{ estimatedTime }}
              </span>
            </div>

            <!-- Status Message -->
            <p v-if="message" class="progress-message">{{ message }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  show: boolean;
  progress: number; // 0-100
  title?: string;
  message?: string;
  canCancel?: boolean;
}>(), {
  title: 'Экспорт в PDF',
  message: '',
  canCancel: false,
});

const emit = defineEmits<{
  cancel: [];
}>();

const startTime = ref<number>(0);

// Расчёт примерного времени до завершения
const estimatedTime = computed(() => {
  if (props.progress <= 5 || props.progress >= 95 || !startTime.value) {
    return '';
  }

  const elapsed = Date.now() - startTime.value;
  if (elapsed < 100) {
    // Слишком рано для оценки
    return '';
  }

  const rate = props.progress / elapsed; // процентов в миллисекунду

  // Защита от деления на 0
  if (rate <= 0) {
    return '';
  }

  const remaining = (100 - props.progress) / rate;

  if (remaining < 1000) {
    return 'менее секунды';
  } else if (remaining < 60000) {
    return `~${Math.round(remaining / 1000)} сек`;
  } else {
    return `~${Math.round(remaining / 60000)} мин`;
  }
});

// Инициализация времени старта
watch(() => props.show, (newShow) => {
  if (newShow) {
    startTime.value = Date.now();
  } else {
    startTime.value = 0;
  }
});

const handleCancel = () => {
  emit('cancel');
};

const handleBackdropClick = () => {
  // Не закрываем по клику на фон для предотвращения случайной отмены
};
</script>

<style scoped>
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.progress-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dark .progress-card {
  background: #1f2937;
  color: #e5e7eb;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.progress-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dark .progress-title {
  color: #f9fafb;
}

.cancel-button {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.dark .cancel-button {
  color: #9ca3af;
}

.dark .cancel-button:hover {
  background: #374151;
  color: #e5e7eb;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-bar-container {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.dark .progress-bar-container {
  background: #374151;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #42a5f5);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-percent {
  font-weight: 600;
  color: #2196f3;
  font-size: 16px;
}

.progress-eta {
  color: #6b7280;
  font-size: 13px;
}

.dark .progress-eta {
  color: #9ca3af;
}

.progress-message {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  text-align: center;
}

.dark .progress-message {
  color: #9ca3af;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .progress-card {
    min-width: 90%;
    margin: 0 16px;
  }
}
</style>
