import { ref, computed } from 'vue';

const ONBOARDING_STORAGE_KEY = 'notebox_onboarding_completed';

// Инициализация происходит при первом вызове useOnboarding
let isInitialized = false;
const isOnboardingCompleted = ref<boolean>(false);
const isOnboardingActive = ref<boolean>(false);

export function useOnboarding() {
  // Инициализируем состояние из localStorage при первом использовании
  if (!isInitialized) {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    isOnboardingCompleted.value = stored === 'true';
    isInitialized = true;
  }

  const checkOnboardingStatus = () => {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    isOnboardingCompleted.value = stored === 'true';
  };

  const startOnboarding = () => {
    isOnboardingActive.value = true;
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    isOnboardingCompleted.value = true;
    isOnboardingActive.value = false;
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    isOnboardingCompleted.value = false;
    startOnboarding();
  };

  const shouldShowOnboarding = computed(() => {
    return !isOnboardingCompleted.value;
  });

  return {
    isOnboardingCompleted,
    isOnboardingActive,
    shouldShowOnboarding,
    checkOnboardingStatus,
    startOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
}
