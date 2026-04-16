<template>
  <div class="profile-section">
    <h2 class="section-title">Профиль</h2>

    <div class="form-group">
      <label class="form-label">Аватар</label>
      <AvatarUpload
        :current-avatar="user.avatarUrl"
        @update="handleAvatarUpdate"
        @remove="handleAvatarRemove"
      />
    </div>

    <div class="form-group">
      <label for="name" class="form-label">Имя</label>
      <input
        id="name"
        v-model="name"
        type="text"
        class="form-input"
        placeholder="Введите ваше имя"
      />
    </div>

    <div class="form-group">
      <label for="email" class="form-label">Email</label>
      <input
        id="email"
        :value="user.email"
        type="email"
        class="form-input"
        disabled
        readonly
      />
      <p class="help-text">Email нельзя изменить</p>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </div>

    <div class="form-actions">
      <button
        type="button"
        @click="handleSave"
        :disabled="!hasChanges || isSaving"
        class="btn-save"
      >
        {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
      </button>

      <button
        v-if="hasChanges"
        type="button"
        @click="handleCancel"
        :disabled="isSaving"
        class="btn-cancel"
      >
        Отмена
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { User } from '../../services/auth/types';
import { authStore } from '../../stores/authStore';
import AvatarUpload from './AvatarUpload.vue';

const props = defineProps<{
  user: User;
}>();

const name = ref(props.user.name);
const avatarUrl = ref<string | null>(props.user.avatarUrl);
const isSaving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const hasChanges = computed(() => {
  return name.value !== props.user.name || avatarUrl.value !== props.user.avatarUrl;
});

watch(() => props.user, (newUser) => {
  name.value = newUser.name;
  avatarUrl.value = newUser.avatarUrl;
}, { deep: true });

const handleAvatarUpdate = (url: string) => {
  avatarUrl.value = url;
  successMessage.value = null;
  error.value = null;
};

const handleAvatarRemove = () => {
  avatarUrl.value = null;
  successMessage.value = null;
  error.value = null;
};

const handleSave = async () => {
  if (!hasChanges.value) return;

  isSaving.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    await authStore.updateProfile({
      name: name.value,
      avatarUrl: avatarUrl.value,
    });
    successMessage.value = 'Профиль успешно обновлён';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось сохранить изменения';
  } finally {
    isSaving.value = false;
  }
};

const handleCancel = () => {
  name.value = props.user.name;
  avatarUrl.value = props.user.avatarUrl;
  error.value = null;
  successMessage.value = null;
};
</script>

<style scoped>
.profile-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.help-text {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.error-banner {
  padding: 12px;
  background: #fee;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
}

.success-banner {
  padding: 12px;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  color: #065f46;
  font-size: 14px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-save,
.btn-cancel {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background: #3b82f6;
  color: white;
  border: none;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:global(.dark) .section-title {
  color: #f9fafb;
}

:global(.dark) .form-label {
  color: #d1d5db;
}

:global(.dark) .form-input {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

:global(.dark) .form-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

:global(.dark) .form-input:disabled {
  background: #111827;
  color: #9ca3af;
}

:global(.dark) .help-text {
  color: #9ca3af;
}

:global(.dark) .error-banner {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fecaca;
}

:global(.dark) .success-banner {
  background: #065f46;
  border-color: #047857;
  color: #d1fae5;
}

:global(.dark) .btn-cancel {
  background: #1f2937;
  color: #d1d5db;
  border-color: #374151;
}

:global(.dark) .btn-cancel:hover:not(:disabled) {
  background: #374151;
}
</style>
