<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div class="modal-container" @click.stop>
          <button class="close-button" @click="handleClose" aria-label="Закрыть">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="modal-content">
            <SettingsSidebar
              :active-section="activeSection"
              @select-section="activeSection = $event"
              @logout="handleLogout"
            />

            <div class="content-area">
              <Transition name="fade" mode="out-in">
                <component :is="currentSectionComponent" :key="activeSection" :user="user" />
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import type { User } from '../../services/auth/types';
import { authStore } from '../../stores/authStore';
import SettingsSidebar from './SettingsSidebar.vue';
import ProfileSection from './ProfileSection.vue';
import AppearanceSection from './AppearanceSection.vue';
import NotificationsSection from './NotificationsSection.vue';

const props = defineProps<{
  isOpen: boolean;
  user: User;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const router = useRouter();
const activeSection = ref('profile');

const currentSectionComponent = computed(() => {
  switch (activeSection.value) {
    case 'profile':
      return ProfileSection;
    case 'appearance':
      return AppearanceSection;
    case 'notifications':
      return NotificationsSection;
    default:
      return ProfileSection;
  }
});

const handleClose = () => {
  emit('close');
};

const handleLogout = async () => {
  await authStore.logout();
  emit('close');
  router.push('/login');
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    handleClose();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

// Reset active section when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    activeSection.value = 'profile';
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  position: relative;
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  height: 600px;
  max-height: 90vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  padding: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f9fafb;
  color: #111827;
}

.modal-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    max-width: none;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }

  .modal-content {
    flex-direction: column;
  }

  .close-button {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
  }
}

:global(.dark) .modal-container {
  background: #1f2937;
}

:global(.dark) .close-button {
  background: #1f2937;
  border-color: #374151;
  color: #9ca3af;
}

:global(.dark) .close-button:hover {
  background: #374151;
  color: #f9fafb;
}

:global(.dark) .content-area {
  background: #1f2937;
}

@media (max-width: 768px) {
  :global(.dark) .close-button {
    background: rgba(31, 41, 55, 0.9);
  }
}
</style>
