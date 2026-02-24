<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click="handleBackdropClick">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">Создать вложенную заметку</h3>
        <input
          ref="inputRef"
          v-model="noteTitle"
          type="text"
          class="modal-input"
          placeholder="Название заметки"
          @keydown.enter="handleCreate"
          @keydown.escape="handleClose"
        />
        <div class="modal-actions">
          <button class="btn btn-primary" @click="handleCreate" :disabled="!noteTitle.trim() || loading">
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>Создать</span>
          </button>
          <button class="btn btn-secondary" @click="handleClose" :disabled="loading">
            Отмена
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  create: [title: string];
  close: [];
}>();

const noteTitle = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const handleCreate = () => {
  if (noteTitle.value.trim()) {
    emit('create', noteTitle.value.trim());
    noteTitle.value = '';
  }
};

const handleClose = () => {
  emit('close');
  noteTitle.value = '';
};

const handleBackdropClick = () => {
  handleClose();
};

// Auto-focus input when modal opens
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.15s ease;
  margin-bottom: 20px;
}

.modal-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal-input::placeholder {
  color: #9ca3af;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .modal-content {
    background: #1f2937;
  }

  .modal-title {
    color: #f3f4f6;
  }

  .modal-input {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  .modal-input:focus {
    border-color: #3b82f6;
  }

  .btn-secondary {
    background-color: #374151;
    color: #e5e7eb;
  }

  .btn-secondary:hover {
    background-color: #4b5563;
  }
}
</style>
